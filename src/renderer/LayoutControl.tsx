import { useLayoutEffect, useRef, useState } from 'react';
import { activeTab, layoutFor, setLayout, type TabState } from './appStore';
import { cx } from './cx';
import { LayoutIcon } from './LayoutIcon';
import { LAYOUTS, type Layout } from '../shared/layouts';

// The layout picker for a tab with more than one terminal. When it hides, the last buttons stay
// so they fade out with it.
export function LayoutControl({ tab }: { tab: TabState | undefined }) {
  const ref = useRef<HTMLDivElement>(null);
  const options = tab ? LAYOUTS[tab.panes.length] : undefined;
  const selected = tab ? layoutFor(tab)?.id : undefined;
  const [kept, setKept] = useState<{ options: Layout[]; selected: string | undefined }>({
    options: [],
    selected: undefined,
  });
  if (options && (kept.options !== options || kept.selected !== selected))
    setKept({ options, selected });
  const buttons = options ?? kept.options;
  const current = options ? selected : kept.selected;
  const key = buttons.map((l) => l.id).join();

  // The title stays centered and clear of the control, which needs its width.
  useLayoutEffect(() => {
    const control = ref.current;
    if (!key || !control) return;
    control
      .closest<HTMLElement>('.main-head')
      ?.style.setProperty('--layout-w', `${control.offsetWidth + 8}px`);
  }, [key]);

  return (
    <div
      ref={ref}
      className={cx('layout-control', options && 'show')}
      id="layout-control"
      role="radiogroup"
      aria-label="Layout"
    >
      {buttons.map((layout) => (
        <button
          key={layout.id}
          className={cx('icon-btn', layout.id === current && 'on')}
          data-layout={layout.id}
          title={layout.label}
          role="radio"
          aria-label={layout.label}
          aria-checked={layout.id === current}
          onClick={() => {
            const active = activeTab();
            if (active) setLayout(active.id, layout.id);
          }}
        >
          <LayoutIcon layout={layout} />
        </button>
      ))}
    </div>
  );
}
