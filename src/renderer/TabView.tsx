import type { CSSProperties } from 'react';
import { layoutFor, showsTabs, type TabState } from './appStore';
import { cx } from './cx';
import { PaneResizer } from './PaneResizer';
import { PaneTabs } from './PaneTabs';
import {
  layoutGrid,
  trackLines,
  tracksFor,
  trackTemplate,
  type TrackLine,
  type TrackSizes,
} from './paneTracks';
import { TerminalPane } from './TerminalPane';

export type TabViewState = 'active' | 'leaving' | 'hidden';

const PANE_AREAS = ['a', 'b', 'c', 'd'];

// One tab. Split, its panes sit in a grid set for the tab's layout, with a handle on each line
// between them to resize them. In tab view, a strip of tabs sits over the panes, which all take
// the whole area, and only the focused one is visible. The others keep their size, so their
// shells keep theirs, and each is the right size the moment its tab is chosen.
export function TabView({ tab, state }: { tab: TabState; state: TabViewState }) {
  const tabbed = showsTabs(tab);
  const layout = tabbed ? null : layoutFor(tab);
  let style: CSSProperties | undefined;
  let tracks: TrackSizes | undefined;
  let lines: TrackLine[] = [];
  if (layout) {
    const grid = layoutGrid(layout.areas);
    tracks = tracksFor(tab.tracks, grid);
    lines = trackLines(grid);
    style = {
      gridTemplateAreas: layout.areas.map((row) => `"${row}"`).join(' '),
      gridTemplateColumns: trackTemplate(tracks.columns),
      gridTemplateRows: trackTemplate(tracks.rows),
    };
  }

  return (
    <div
      className={cx(
        'tab-view',
        state === 'active' && 'active',
        state === 'leaving' && 'leaving',
        layout && 'split',
        tabbed && 'tabbed',
      )}
      style={style}
    >
      {tabbed && <PaneTabs tab={tab} />}
      {/* The handles come first, so Tab reaches them before a terminal, which keeps Tab. */}
      {tracks &&
        lines.map((line) => (
          <PaneResizer
            key={`${line.axis} ${line.index} ${line.from}`}
            tabId={tab.id}
            line={line}
            sizes={tracks[line.axis]}
          />
        ))}
      {tab.panes.map((pane, index) => (
        <TerminalPane
          key={pane.id}
          tab={tab}
          pane={pane}
          area={layout ? PANE_AREAS[index] : undefined}
        />
      ))}
    </div>
  );
}
