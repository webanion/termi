import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { resizeTracks } from './appStore';
import { evenLine, linePercent, moveLine, trackTemplate, type TrackLine } from './paneTracks';
import { PANE_MIN_HEIGHT, PANE_MIN_WIDTH } from './theme';

const KEY_STEP = 20; // pixels for each arrow key press

interface Props {
  tabId: number;
  line: TrackLine;
  sizes: number[]; // the tracks of the line's axis
}

// The pixels the tracks of one axis of a tab's grid share, without the gaps between them.
function trackSpace(view: HTMLElement, line: TrackLine, count: number): number {
  const style = getComputedStyle(view);
  const columns = line.axis === 'columns';
  const gap = parseFloat(columns ? style.columnGap : style.rowGap) || 0;
  return (columns ? view.clientWidth : view.clientHeight) - gap * (count - 1);
}

// Drag the line between two panes of a split tab to resize them, like the sidebar. The grid
// template changes straight on the tab's element while dragging, and the sizes go to the store
// once, when the drag ends, which is when the terminals are fitted. A double-click resets the
// line, and the arrow keys move it when it has focus.
export function PaneResizer({ tabId, line, sizes }: Props) {
  const columns = line.axis === 'columns';
  const min = columns ? PANE_MIN_WIDTH : PANE_MIN_HEIGHT;
  // Its line lies in the gap just before the track after it.
  const style: CSSProperties = columns
    ? { gridColumn: line.index + 2, gridRow: `${line.from + 1} / ${line.to + 2}` }
    : { gridRow: line.index + 2, gridColumn: `${line.from + 1} / ${line.to + 2}` };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const view = event.currentTarget.parentElement;
    if (event.button !== 0 || !view) return;
    event.preventDefault();
    const resizer = event.currentTarget;
    resizer.setPointerCapture(event.pointerId);
    resizer.classList.add('dragging');
    const start = columns ? event.clientX : event.clientY;
    const space = trackSpace(view, line, sizes.length);
    let next = sizes;

    const onMove = (move: PointerEvent) => {
      const delta = (columns ? move.clientX : move.clientY) - start;
      next = moveLine(sizes, line.index, delta, space, min);
      view.style[columns ? 'gridTemplateColumns' : 'gridTemplateRows'] = trackTemplate(next);
    };
    // Fires when the button is let go, and when the system takes the pointer away.
    const onEnd = () => {
      resizer.classList.remove('dragging');
      resizer.removeEventListener('pointermove', onMove);
      resizer.removeEventListener('lostpointercapture', onEnd);
      if (next !== sizes) resizeTracks(tabId, line.axis, next);
    };
    resizer.addEventListener('pointermove', onMove);
    resizer.addEventListener('lostpointercapture', onEnd);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const keys = columns ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown'];
    const direction = keys.indexOf(event.key);
    const view = event.currentTarget.parentElement;
    if (direction < 0 || !view) return;
    event.preventDefault();
    const delta = direction ? KEY_STEP : -KEY_STEP;
    const space = trackSpace(view, line, sizes.length);
    resizeTracks(tabId, line.axis, moveLine(sizes, line.index, delta, space, min));
  };

  return (
    <div
      className={`pane-resizer ${columns ? 'vertical' : 'horizontal'}`}
      style={style}
      role="separator"
      aria-orientation={columns ? 'vertical' : 'horizontal'}
      aria-valuenow={linePercent(sizes, line.index)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={columns ? 'Resize the columns' : 'Resize the rows'}
      tabIndex={0}
      title="Drag to resize, double-click to reset"
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={() => resizeTracks(tabId, line.axis, evenLine(sizes, line.index))}
    ></div>
  );
}
