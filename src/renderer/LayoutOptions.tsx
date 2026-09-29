import type { KeyboardEvent, Ref } from 'react';
import { cx } from './cx';
import { LayoutIcon } from './LayoutIcon';
import type { Layout } from '../shared/layouts';

const STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

// The index an arrow, Home or End key moves to, wrapping around, or undefined for another key.
function moveTo(key: string, index: number, count: number): number | undefined {
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  const step = STEPS[key];
  return step === undefined ? undefined : (index + step + count) % count;
}

interface Props {
  layouts: Layout[];
  selected: string | undefined;
  onSelect: (id: string) => void;
  labeled?: boolean; // show each layout's name next to its icon, instead of as a tooltip
  ref?: Ref<HTMLDivElement>;
  className?: string;
  id?: string;
}

// Layouts to choose from, as a radio group, in the header and in the saved command dialog. Only
// the selected layout takes Tab, and the arrow keys select the one before or after it.
export function LayoutOptions({
  layouts,
  selected,
  onSelect,
  labeled = false,
  ref,
  className,
  id,
}: Props) {
  const tabStop = layouts.some((l) => l.id === selected) ? selected : layouts[0]?.id;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = moveTo(event.key, index, layouts.length);
    const layout = next === undefined ? undefined : layouts[next];
    if (next === undefined || !layout) return;
    event.preventDefault();
    onSelect(layout.id);
    const group = event.currentTarget.parentElement;
    group?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  };

  return (
    <div ref={ref} className={className} id={id} role="radiogroup" aria-label="Layout">
      {layouts.map((layout, index) => (
        <button
          key={layout.id}
          type="button"
          className={cx(labeled ? 'layout-option' : 'icon-btn', layout.id === selected && 'on')}
          data-layout={layout.id}
          title={labeled ? undefined : layout.label}
          role="radio"
          aria-label={labeled ? undefined : layout.label}
          aria-checked={layout.id === selected}
          tabIndex={layout.id === tabStop ? 0 : -1}
          onClick={() => onSelect(layout.id)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          <LayoutIcon layout={layout} />
          {labeled && <span>{layout.label}</span>}
        </button>
      ))}
    </div>
  );
}
