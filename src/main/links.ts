import { shell } from 'electron';

// Only web links leave the app, and they open in the default browser, never in the window.
export const isWebLink = (url: string): boolean => /^https?:\/\//.test(url);

export function openLink(url: string): void {
  if (isWebLink(url)) shell.openExternal(url);
}
