// Links from the Help menu, all to the repository's pages on GitHub. The page opens them with
// window.open, which main hands to the browser.

import { REPO_URL } from '../shared/appActions';
import type { AppInfo } from '../shared/types';

const SYSTEMS: Record<string, string> = { darwin: 'macOS', linux: 'Linux', win32: 'Windows' };

// The bug report form, with the version, the system and the shell filled in. Nothing else is
// collected and nothing is sent: the person reads the form and submits it themselves.
export function issueUrl(info: AppInfo, shell: string): string {
  const params = new URLSearchParams({
    template: 'bug_report.yml',
    version: info.version,
    system: SYSTEMS[info.platform] ?? info.platform,
  });
  if (shell) params.set('shell', shell);
  return `${REPO_URL}/issues/new?${params.toString()}`;
}

export function releaseNotesUrl(version: string): string {
  return `${REPO_URL}/releases/tag/v${version}`;
}
