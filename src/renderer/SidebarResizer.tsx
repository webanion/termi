import type { PointerEvent as ReactPointerEvent } from 'react';
import { getState, resetSidebarWidth, saveSidebarWidth } from './appStore';
import { SIDEBAR_MAX, SIDEBAR_MIN } from './theme';

// Drag to resize the sidebar. The width goes straight to the CSS variable while dragging, and
// is saved once, when the drag ends. A double-click resets it.
export function SidebarResizer() {
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const resizer = event.currentTarget;
    resizer.setPointerCapture(event.pointerId);
    resizer.classList.add('dragging');
    document.body.classList.add('resizing');
    let width = getState().settings.sidebarWidth;

    const onMove = (move: PointerEvent) => {
      width = Math.round(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, move.clientX)));
      document.documentElement.style.setProperty('--sidebar-w', `${width}px`);
    };
    const onUp = () => {
      resizer.classList.remove('dragging');
      document.body.classList.remove('resizing');
      resizer.removeEventListener('pointermove', onMove);
      resizer.removeEventListener('pointerup', onUp);
      saveSidebarWidth(width);
    };
    resizer.addEventListener('pointermove', onMove);
    resizer.addEventListener('pointerup', onUp);
  };

  return (
    <div
      className="resizer"
      id="resizer"
      title="Drag to resize"
      onPointerDown={onPointerDown}
      onDoubleClick={resetSidebarWidth}
    ></div>
  );
}
