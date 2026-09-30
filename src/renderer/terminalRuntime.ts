// Each pane's terminal lives here, outside React: the xterm Terminal, its addons and its shell.
// Store actions create and dispose runtimes. TerminalPane only lends a host element with
// attach() and takes it back with detach(), which never stops anything. So React re-rendering,
// remounting, or running effects twice in StrictMode can never start or kill a shell.

import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { TERMINAL_FONT, THEME } from './theme';
import { noWrapCols, scrollToCursor, sidewaysDelta } from './wordWrap';
import type { CursorStyle, PtyCreated } from '@/shared/types';

export interface RuntimeEvents {
  onTitle: (paneId: string, title: string) => void;
  onPtyCreated: (paneId: string, created: PtyCreated) => void;
}

interface RuntimeOptions {
  paneId: string;
  command: string;
  cwd: string | undefined;
  fontSize: number;
  cursorStyle: CursorStyle;
  cursorBlink: boolean;
  wrap: boolean;
  events: RuntimeEvents;
}

const runtimes = new Map<string, TerminalRuntime>(); // pane id -> runtime
const byPty = new Map<number, TerminalRuntime>(); // pty id -> runtime
const earlyData = new Map<number, string>(); // output that arrived before its runtime knew its pty

// The width of xterm's own vertical scrollbar, which covers the right edge of the screen.
const SCROLLBAR_WIDTH = 14;
// For this long after a key press, the pane follows the cursor sideways, as the shell echoes it.
const FOLLOW_MS = 500;

export class TerminalRuntime {
  readonly paneId: string;
  readonly term: Terminal;
  private readonly fitAddon = new FitAddon();
  private readonly command: string;
  private readonly cwd: string | undefined;
  private readonly events: RuntimeEvents;
  ptyId: number | null = null;
  hoveredLink: string | null = null; // the web link under the mouse, for the right-click menu
  private opened = false;
  private spawned = false;
  private disposed = false;
  private wrap: boolean;
  private wide = false; // wrap is off and the terminal is wider than its pane
  private lastInput = 0;
  // With wrap off, a native scrollbar under the terminal that shifts the screen sideways. The
  // screen moves, not the whole terminal, so xterm's vertical scrollbar stays in view.
  private readonly sideways = document.createElement('div');
  private readonly sidewaysWidth = document.createElement('div');

  constructor({
    paneId,
    command,
    cwd,
    fontSize,
    cursorStyle,
    cursorBlink,
    wrap,
    events,
  }: RuntimeOptions) {
    this.paneId = paneId;
    this.command = command;
    this.cwd = cwd;
    this.events = events;
    this.wrap = wrap;
    this.term = new Terminal({
      fontFamily: TERMINAL_FONT,
      fontSize,
      lineHeight: 1.2,
      cursorBlink,
      cursorStyle,
      cursorWidth: 2,
      scrollback: 10000,
      allowProposedApi: true,
      macOptionClickForcesSelection: true,
      theme: THEME,
    });
    this.term.loadAddon(this.fitAddon);
    // Links open in the browser with Cmd+click (Ctrl+click on other systems).
    this.term.loadAddon(
      new WebLinksAddon(
        (event, uri) => {
          if (event.metaKey || event.ctrlKey) window.open(uri);
        },
        {
          hover: (_event, uri) => (this.hoveredLink = uri),
          leave: () => (this.hoveredLink = null),
        },
      ),
    );
    this.term.onData((data) => {
      if (this.ptyId !== null) window.termi.pty.write(this.ptyId, data);
      this.lastInput = performance.now();
      this.followCursor();
    });
    this.term.onCursorMove(() => {
      if (performance.now() - this.lastInput < FOLLOW_MS) this.followCursor();
    });
    this.term.onRender(() => this.sizeSideways());
    // A program on the alternate screen, such as vim, htop or less, draws for the size it has,
    // so it gets the pane's width. The wide size comes back when it leaves.
    this.term.buffer.onBufferChange(() => this.layout());
    this.term.onResize(({ cols, rows }) => {
      if (this.ptyId !== null) window.termi.pty.resize(this.ptyId, cols, rows);
    });
    this.term.onTitleChange((title) => this.events.onTitle(this.paneId, title));
  }

  // Show the terminal in `host`. The first call opens xterm and starts the shell, once, at the
  // size the pane has. Later calls only fit, or move the terminal if the host changed.
  attach(host: HTMLElement): void {
    if (this.disposed) return;
    if (!this.opened) {
      this.term.open(host);
      this.openSideways();
      try {
        const webgl = new WebglAddon();
        webgl.onContextLoss(() => webgl.dispose());
        this.term.loadAddon(webgl);
      } catch {
        // WebGL is not available: xterm keeps its DOM renderer.
      }
      this.opened = true;
    } else if (this.term.element && this.term.element.parentElement !== host) {
      host.appendChild(this.term.element);
    }
    this.measure(host);
    if (!this.spawned) {
      this.spawned = true;
      void this.spawn();
    }
  }

  // React lends the host element back when the pane unmounts. The terminal and its shell live on.
  detach(): void {}

  fit(): void {
    if (this.opened && !this.disposed) this.layout();
  }

  // Word wrap on fits the terminal to its pane, and xterm rewraps the output to the new width.
  // Off, the terminal gets more columns than the pane shows, and the output unwraps.
  setWrap(wrap: boolean): void {
    this.wrap = wrap;
    this.fit();
    this.followCursor();
  }

  focus(): void {
    if (this.opened && !this.disposed) this.term.focus();
  }

  write(data: string): void {
    this.term.write(data);
  }

  // Text that goes to the shell as a paste. xterm wraps it in bracketed paste when the program
  // asks for that, so a shell shows it on its line and runs nothing until Enter.
  paste(text: string): void {
    if (this.opened && !this.disposed) this.term.paste(text);
  }

  // Stop the shell now, and free the terminal after `delay`, once a closing tab has faded out.
  dispose(delay = 0): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.ptyId !== null) {
      window.termi.pty.kill(this.ptyId);
      byPty.delete(this.ptyId);
      earlyData.delete(this.ptyId);
    }
    runtimes.delete(this.paneId);
    const free = () => this.term.dispose();
    if (delay > 0) setTimeout(free, delay);
    else free();
  }

  // A tab that is not showing has no size, and a shell has to start at the size it will have,
  // so show the tab for the moment it takes to measure.
  private measure(host: HTMLElement): void {
    const view = host.closest('.tab-view');
    const hidden =
      view && !view.classList.contains('active') && !view.classList.contains('leaving');
    if (hidden) view.classList.add('active');
    this.layout();
    if (hidden) view.classList.remove('active');
  }

  // Fit the rows to the pane, and the columns too unless wrap is off. Off, the terminal's element
  // gets padding below for the sideways scrollbar, which the fit addon leaves out of the rows.
  private layout(): void {
    const element = this.term.element;
    if (!element) return;
    this.wide = !this.wrap && this.term.buffer.active.type === 'normal';
    element.classList.toggle('no-wrap', this.wide);
    if (!this.wide) {
      this.fitAddon.fit();
      this.sideways.scrollLeft = 0;
      this.shiftScreen();
      return;
    }
    const dims = this.fitAddon.proposeDimensions();
    if (!dims || !Number.isFinite(dims.cols) || !Number.isFinite(dims.rows)) return;
    const cols = noWrapCols(dims.cols);
    if (cols !== this.term.cols || dims.rows !== this.term.rows) this.term.resize(cols, dims.rows);
    this.sizeSideways();
  }

  private openSideways(): void {
    const element = this.term.element;
    if (!element) return;
    this.sideways.className = 'sideways-scroll';
    this.sideways.setAttribute('aria-hidden', 'true');
    this.sideways.append(this.sidewaysWidth);
    element.append(this.sideways);
    this.sideways.addEventListener('scroll', () => this.shiftScreen());
    // A swipe or Shift and the wheel scrolls sideways. xterm has already taken a vertical scroll
    // by the time the event bubbles up here, and marked it.
    element.addEventListener(
      'wheel',
      (event) => {
        if (!this.wide || event.defaultPrevented) return;
        const delta = sidewaysDelta(event, this.cellWidth());
        if (!delta) return;
        this.sideways.scrollLeft += delta;
        event.preventDefault();
      },
      { passive: false },
    );
  }

  private screen(): HTMLElement | null {
    return this.term.element?.querySelector<HTMLElement>('.xterm-screen') ?? null;
  }

  private cellWidth(): number {
    const width = parseFloat(this.screen()?.style.width ?? '');
    return width > 0 ? width / this.term.cols : 0;
  }

  // The scrollbar spans the screen, and the right edge xterm's scrollbar covers.
  private sizeSideways(): void {
    if (!this.wide) return;
    const width = `${(parseFloat(this.screen()?.style.width ?? '') || 0) + SCROLLBAR_WIDTH}px`;
    if (this.sidewaysWidth.style.width !== width) this.sidewaysWidth.style.width = width;
  }

  private shiftScreen(): void {
    const screen = this.screen();
    if (!screen) return;
    const scroll = this.wide ? this.sideways.scrollLeft : 0;
    screen.style.transform = scroll ? `translateX(${-scroll}px)` : '';
  }

  private followCursor(): void {
    if (!this.wide) return;
    const visible = this.sideways.clientWidth - SCROLLBAR_WIDTH;
    const cellWidth = this.cellWidth();
    if (visible <= 0 || cellWidth <= 0) return;
    const { scrollLeft } = this.sideways;
    const next = scrollToCursor(scrollLeft, this.term.buffer.active.cursorX, cellWidth, visible);
    if (next !== scrollLeft) this.sideways.scrollLeft = next;
  }

  private async spawn(): Promise<void> {
    const created = await window.termi.pty.create({
      cols: this.term.cols,
      rows: this.term.rows,
      cwd: this.cwd,
      command: this.command,
    });
    if (this.disposed) {
      window.termi.pty.kill(created.id);
      return;
    }
    this.ptyId = created.id;
    byPty.set(created.id, this);
    const pending = earlyData.get(created.id);
    if (pending) {
      this.term.write(pending);
      earlyData.delete(created.id);
    }
    this.events.onPtyCreated(this.paneId, created);
  }
}

export function createRuntime(options: RuntimeOptions): TerminalRuntime {
  const runtime = new TerminalRuntime(options);
  runtimes.set(options.paneId, runtime);
  return runtime;
}

export function getRuntime(paneId: string): TerminalRuntime | undefined {
  return runtimes.get(paneId);
}

export function runtimeForPty(ptyId: number): TerminalRuntime | undefined {
  return byPty.get(ptyId);
}

export function allRuntimes(): IterableIterator<TerminalRuntime> {
  return runtimes.values();
}

// Output for a shell whose runtime does not know its pty id yet is kept until it does.
export function routePtyData(ptyId: number, data: string): TerminalRuntime | undefined {
  const runtime = byPty.get(ptyId);
  if (runtime) runtime.write(data);
  else earlyData.set(ptyId, (earlyData.get(ptyId) ?? '') + data);
  return runtime;
}

export function forgetPtyData(ptyId: number): void {
  earlyData.delete(ptyId);
}

// This module holds live terminals. Hot-swapping it would leave the page on a copy that has
// none, so an edit to it reloads the page instead.
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
