import { useEffect, useMemo, useRef } from 'react';
import { fitActiveTab, isLayoutAnimating } from './appStore';
import { EmptyState } from './EmptyState';
import { TabView, type TabViewState } from './TabView';
import { Toast } from './Toast';
import { useAppState } from './useAppState';

export function TerminalArea() {
  const tabs = useAppState((s) => s.tabs);
  const closing = useAppState((s) => s.closing);
  const activeId = useAppState((s) => s.activeId);
  const leavingId = useAppState((s) => s.leavingId);
  const ref = useRef<HTMLDivElement>(null);

  // Refit the tab on screen when this area changes size, but only once after the sidebar slides.
  useEffect(() => {
    const area = ref.current;
    if (!area) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      if (isLayoutAnimating()) return;
      frame = requestAnimationFrame(fitActiveTab);
    });
    observer.observe(area);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  // Every tab keeps its view, in the order the tabs were opened. A closed tab's view stays until
  // it has faded out.
  const views = useMemo(() => {
    const open = tabs.map((tab) => {
      const state: TabViewState =
        tab.id === activeId ? 'active' : tab.id === leavingId ? 'leaving' : 'hidden';
      return { tab, state };
    });
    const gone = closing.map(({ tab, wasActive }) => ({
      tab,
      state: (wasActive ? 'leaving' : 'hidden') as TabViewState,
    }));
    return [...open, ...gone].sort((a, b) => a.tab.id - b.tab.id);
  }, [tabs, closing, activeId, leavingId]);

  return (
    <div className="terminals" id="terminals" ref={ref}>
      <EmptyState hidden={tabs.length > 0} />
      <Toast />
      {views.map(({ tab, state }) => (
        <TabView key={tab.id} tab={tab} state={state} />
      ))}
    </div>
  );
}
