// @vitest-environment jsdom
// The settings panel opens from its action, applies and saves each change at once, puts a setting
// back to its default, shows Open at login only where main can set it, and follows a change to
// settings.json made outside the app.
import './stubTermi';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@/shared/settings';
import type { Settings } from '@/shared/types';

// Two terminals, so the test sees each option reach every one.
const terms = vi.hoisted(() => [{ options: {} }, { options: {} }] as { options: object }[]);

vi.mock('@/renderer/terminalRuntime', () => ({
  createRuntime: () => ({}),
  getRuntime: () => undefined,
  allRuntimes: () => terms.map((term) => ({ term })).values(),
  routePtyData: () => undefined,
  runtimeForPty: () => undefined,
  forgetPtyData: () => {},
}));

let container: HTMLElement;
let root: Root;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  // jsdom has no modal dialogs.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

async function openPanel({ loginItem = null as boolean | null, saved = {} } = {}) {
  vi.resetModules();
  for (const term of terms) term.options = {};
  let settings: Settings = { ...DEFAULT_SETTINGS, guideSeen: true, ...saved };
  vi.spyOn(window.termi.settings, 'get').mockResolvedValue(settings);
  const update = vi.spyOn(window.termi.settings, 'update').mockImplementation(async (patch) => {
    settings = { ...settings, ...patch };
    return settings;
  });
  let changed: (next: Settings) => void = () => {};
  vi.spyOn(window.termi.settings, 'onChange').mockImplementation((callback) => {
    changed = callback;
    return () => {};
  });
  let login = loginItem;
  vi.spyOn(window.termi.loginItem, 'get').mockImplementation(async () => login);
  const setLogin = vi.spyOn(window.termi.loginItem, 'set').mockImplementation(async (open) => {
    login = login === null ? null : open;
    return login;
  });

  const store = await import('@/renderer/appStore');
  const { SettingsDialog } = await import('@/renderer/SettingsDialog');
  await store.init();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<SettingsDialog />));
  await act(async () => store.runAction('open-settings'));

  const $ = (selector: string) => container.querySelector<HTMLElement>(selector);
  const click = async (selector: string) => {
    await act(async () => $(selector)?.click());
  };
  const outside = (patch: Partial<Settings>) => act(() => changed({ ...settings, ...patch }));
  return { store, update, setLogin, $, click, outside };
}

const reset = (id: string) => `#setting-${id} .setting-reset`;

describe('the settings panel', () => {
  it('opens from its action, and the same action closes it', async () => {
    const { store, $ } = await openPanel();
    expect(store.getState().overlay).toBe('settings');
    expect($('#settings-title')?.textContent).toBe('Settings');
    expect($('#settings-tab-general')?.getAttribute('aria-selected')).toBe('true');
    act(() => store.runAction('open-settings'));
    expect(store.getState().overlay).toBeNull();
  });

  it('shows and hides the sidebar, and saves it', async () => {
    const { update, $, click } = await openPanel();
    const toggle = '#setting-sidebar [role="switch"]';
    expect($(toggle)?.getAttribute('aria-checked')).toBe('true');
    expect(($(reset('sidebar')) as HTMLButtonElement).disabled).toBe(true);
    await click(toggle);
    expect(update).toHaveBeenLastCalledWith({ sidebarHidden: true });
    expect($(toggle)?.getAttribute('aria-checked')).toBe('false');
    expect(document.body.classList.contains('sidebar-hidden')).toBe(true);
    await click(reset('sidebar'));
    expect(update).toHaveBeenLastCalledWith({ sidebarHidden: false });
  });

  it('changes the text size of every terminal, within 9 to 28', async () => {
    const { update, $, click } = await openPanel({ saved: { fontSize: 27 } });
    await click('#settings-tab-terminal');
    expect($('.stepper-value')?.textContent).toBe('27');
    await click('.stepper [aria-label="Bigger text"]');
    expect(update).toHaveBeenLastCalledWith({ fontSize: 28 });
    expect(terms.map((t) => t.options)).toEqual([
      expect.objectContaining({ fontSize: 28 }),
      expect.objectContaining({ fontSize: 28 }),
    ]);
    expect(($('.stepper [aria-label="Bigger text"]') as HTMLButtonElement).disabled).toBe(true);
    await click(reset('font-size'));
    expect(update).toHaveBeenLastCalledWith({ fontSize: 13 });
    expect($('.stepper-value')?.textContent).toBe('13');
  });

  it('sets the cursor style and blinking on every terminal', async () => {
    const { update, $, click } = await openPanel();
    await click('#settings-tab-terminal');
    expect($('[data-cursor="bar"]')?.getAttribute('aria-checked')).toBe('true');
    await click('[data-cursor="block"]');
    expect(update).toHaveBeenLastCalledWith({ cursorStyle: 'block' });
    await click('#setting-cursor-blink [role="switch"]');
    expect(update).toHaveBeenLastCalledWith({ cursorBlink: false });
    for (const term of terms)
      expect(term.options).toMatchObject({ cursorStyle: 'block', cursorBlink: false });
  });

  it('turns smooth scrolling off and on for every terminal', async () => {
    const { update, $, click } = await openPanel();
    await click('#settings-tab-terminal');
    const toggle = '#setting-smooth-scroll [role="switch"]';
    expect($(toggle)?.getAttribute('aria-checked')).toBe('true');
    await click(toggle);
    expect(update).toHaveBeenLastCalledWith({ smoothScroll: false });
    for (const term of terms) expect(term.options).toMatchObject({ smoothScrollDuration: 0 });
    await click(reset('smooth-scroll'));
    expect(update).toHaveBeenLastCalledWith({ smoothScroll: true });
    expect($(toggle)?.getAttribute('aria-checked')).toBe('true');
    for (const term of terms) expect(term.options).toMatchObject({ smoothScrollDuration: 125 });
  });

  it('puts every setting back with Reset all', async () => {
    const saved = {
      fontSize: 18,
      cursorStyle: 'underline',
      cursorBlink: false,
      smoothScroll: false,
    } as const;
    const { update, $, click } = await openPanel({ saved, loginItem: true });
    expect(($('#settings-reset-all') as HTMLButtonElement).disabled).toBe(false);
    await click('#settings-reset-all');
    expect(update).toHaveBeenLastCalledWith({
      fontSize: 13,
      cursorStyle: 'bar',
      cursorBlink: true,
      smoothScroll: true,
      sidebarHidden: false,
    });
    expect(window.termi.loginItem.set).toHaveBeenCalledWith(false);
    expect(($('#settings-reset-all') as HTMLButtonElement).disabled).toBe(true);
  });

  it('leaves out Open at login where main cannot set it', async () => {
    const { $ } = await openPanel({ loginItem: null });
    expect($('#setting-login')).toBeNull();
  });

  it('turns Open at login on and off through main', async () => {
    const { setLogin, $, click } = await openPanel({ loginItem: false });
    const toggle = '#setting-login [role="switch"]';
    expect($(toggle)?.getAttribute('aria-checked')).toBe('false');
    await click(toggle);
    expect(setLogin).toHaveBeenLastCalledWith(true);
    expect($(toggle)?.getAttribute('aria-checked')).toBe('true');
  });

  it('shows and applies a change made to settings.json while it is open', async () => {
    const { $, click, outside } = await openPanel();
    await click('#settings-tab-terminal');
    outside({ fontSize: 20, cursorStyle: 'underline' });
    expect($('.stepper-value')?.textContent).toBe('20');
    expect($('[data-cursor="underline"]')?.getAttribute('aria-checked')).toBe('true');
    for (const term of terms)
      expect(term.options).toMatchObject({ fontSize: 20, cursorStyle: 'underline' });
  });
});
