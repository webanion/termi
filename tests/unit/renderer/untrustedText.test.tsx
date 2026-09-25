// @vitest-environment jsdom
// Text from a terminal (its title, the running program's name) and from settings (a saved
// command's name) is controlled by whatever runs in the shell or edits the file. It must reach
// the page as text. An element parsed out of it could reach window.termi.
import './stubTermi';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { CommandRow } from '../../../src/renderer/CommandRow';
import { TerminalRow } from '../../../src/renderer/TerminalRow';
import type { TabState } from '../../../src/renderer/appStore';

const PAYLOAD = '<img src=x onerror="window.__pwned = true">';

let container: HTMLElement;
let root: Root;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

function render(element: React.ReactNode) {
  container = document.createElement('ul');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(element));
}

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const tab = (overrides: Partial<TabState>): TabState => ({
  id: 1,
  name: 'zsh',
  customName: false,
  commandId: null,
  activity: false,
  layout: null,
  panes: [{ id: 'p1', command: '', proc: 'zsh', shellName: 'zsh', attached: true }],
  focusedPaneId: 'p1',
  ready: true,
  ...overrides,
});

function expectText(where: Element | null) {
  expect(container.querySelector('img')).toBeNull();
  expect(where?.textContent).toBe(PAYLOAD);
  expect((window as { __pwned?: boolean }).__pwned).toBeUndefined();
}

describe('untrusted text stays text', () => {
  it('in a terminal title set by an escape sequence', () => {
    render(<TerminalRow tab={tab({ name: PAYLOAD })} index={0} presence="present" />);
    expectText(container.querySelector('.item-name'));
    expect(container.querySelector('.item')?.getAttribute('title')).toBe(PAYLOAD);
  });

  it('in the name of the program running in a terminal', () => {
    const panes = [{ id: 'p1', command: '', proc: PAYLOAD, shellName: 'zsh', attached: true }];
    render(<TerminalRow tab={tab({ panes })} index={0} presence="present" />);
    expectText(container.querySelector('.item-meta'));
  });

  it('in a saved command name and its commands', () => {
    const cmd = { id: 'c1', name: PAYLOAD, terminals: [{ command: PAYLOAD }], cwd: PAYLOAD };
    render(<CommandRow cmd={cmd} presence="present" />);
    expectText(container.querySelector('.item-name'));
    expect(container.querySelector('.item')?.getAttribute('title')).toBe(
      `${PAYLOAD}\nin ${PAYLOAD}`,
    );
  });
});
