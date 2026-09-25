// The guide, in the order it is read. Each page is a markdown file in guide/, bundled with the
// page, and may offer one action to try.

import copyingAndStats from './guide/copyingAndStats.md?raw';
import mcpServer from './guide/mcpServer.md?raw';
import savedCommands from './guide/savedCommands.md?raw';
import splitTerminals from './guide/splitTerminals.md?raw';
import terminals from './guide/terminals.md?raw';
import type { AppAction } from '../shared/appActions';

export interface GuidePage {
  source: string;
  tryIt?: { label: string; action: AppAction };
}

export const GUIDE_PAGES: GuidePage[] = [
  { source: terminals, tryIt: { label: 'Open a terminal', action: 'new-terminal' } },
  { source: savedCommands, tryIt: { label: 'Save a command', action: 'new-command' } },
  { source: splitTerminals, tryIt: { label: 'Save a split command', action: 'new-command' } },
  { source: copyingAndStats, tryIt: { label: 'Show every shortcut', action: 'show-shortcuts' } },
  { source: mcpServer },
];
