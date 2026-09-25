import type { ITheme } from '@xterm/xterm';

export const DEFAULT_FONT_SIZE = 13;
export const DURATION = 220; // matches --dur in styles/base.css
export const SIDEBAR_MIN = 170;
export const SIDEBAR_MAX = 420;
export const SIDEBAR_DEFAULT = 232;

export const TERMINAL_FONT =
  "ui-monospace, 'SF Mono', Menlo, Monaco, 'Cascadia Mono', Consolas, " +
  "'DejaVu Sans Mono', 'Ubuntu Mono', 'Noto Sans Mono', 'Liberation Mono', monospace";

export const THEME: ITheme = {
  background: '#262624',
  foreground: '#e8e6dc',
  cursor: '#d97757',
  cursorAccent: '#262624',
  selectionBackground: 'rgba(217, 119, 87, 0.32)',
  selectionInactiveBackground: 'rgba(217, 119, 87, 0.18)',
  scrollbarSliderBackground: 'rgba(245, 240, 230, 0.12)',
  scrollbarSliderHoverBackground: 'rgba(245, 240, 230, 0.2)',
  scrollbarSliderActiveBackground: 'rgba(217, 119, 87, 0.45)',
  black: '#3a3936',
  red: '#e5776b',
  green: '#9cc289',
  yellow: '#e6bd6f',
  blue: '#82a9d9',
  magenta: '#c89cd9',
  cyan: '#80c5bc',
  white: '#d6d3c9',
  brightBlack: '#6b6962',
  brightRed: '#f08d80',
  brightGreen: '#b3d6a1',
  brightYellow: '#f0cf8c',
  brightBlue: '#9fc0e8',
  brightMagenta: '#d9b4e6',
  brightCyan: '#9ad8d0',
  brightWhite: '#faf9f5',
};
