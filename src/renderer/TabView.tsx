import type { CSSProperties } from 'react';
import { layoutFor, type TabState } from './appStore';
import { cx } from './cx';
import { TerminalPane } from './TerminalPane';

export type TabViewState = 'active' | 'leaving' | 'hidden';

const PANE_AREAS = ['a', 'b', 'c', 'd'];

// One tab. Its panes sit in a grid set for the tab's layout.
export function TabView({ tab, state }: { tab: TabState; state: TabViewState }) {
  const layout = layoutFor(tab);
  let style: CSSProperties | undefined;
  if (layout) {
    const grid = layout.areas.map((row) => row.split(' '));
    style = {
      gridTemplateAreas: layout.areas.map((row) => `"${row}"`).join(' '),
      gridTemplateColumns: `repeat(${grid[0]?.length}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${grid.length}, minmax(0, 1fr))`,
    };
  }

  return (
    <div
      className={cx(
        'tab-view',
        state === 'active' && 'active',
        state === 'leaving' && 'leaving',
        layout && 'split',
      )}
      style={style}
    >
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
