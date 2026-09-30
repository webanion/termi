import type { KeyboardEvent, ReactElement, Ref } from 'react';
import { cx } from './cx';
import { LayoutIcon, TabsIcon } from './LayoutIcon';
import type { Layout } from '@/shared/layouts';

const STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

// The index an arrow, Home or End key moves to, wrapping around, or undefined for another key.
export function moveTo(key: string, index: number, count: number): number | undefined {
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  const step = STEPS[key];
  return step === undefined ? undefined : (index + step + count) % count;
}

// The choice for tab view, after the layouts. No layout has this id.
export const TABS_CHOICE = 'tabs';

interface Choice {
  id: string;
  label: string;
  icon: ReactElement;
}

interface Props {
  layouts: Layout[];
  tabs?: boolean; // offer tab view too, after the layouts
  selected: string | undefined; // a layout's id, or TABS_CHOICE
  onSelect: (id: string) => void;
  labeled?: boolean; // show each layout's name next to its icon, instead of as a tooltip
  ref?: Ref<HTMLDivElement>;
  className?: string;
  id?: string;
}

// Layouts to choose from, as a radio group, in the header and in the saved command dialog, and
// then tab view. Only the selected choice takes Tab, and the arrow keys select the one before or
// after it.
export function LayoutOptions({
  layouts,
  tabs = false,
  selected,
  onSelect,
  labeled = false,
  ref,
  className,
  id,
}: Props) {
  const choices: Choice[] = layouts.map((layout) => ({
    id: layout.id,
    label: layout.label,
    icon: <LayoutIcon layout={layout} />,
  }));
  if (tabs) choices.push({ id: TABS_CHOICE, label: 'Tabs', icon: <TabsIcon /> });
  const tabStop = choices.some((c) => c.id === selected) ? selected : choices[0]?.id;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = moveTo(event.key, index, choices.length);
    const choice = next === undefined ? undefined : choices[next];
    if (next === undefined || !choice) return;
    event.preventDefault();
    onSelect(choice.id);
    const group = event.currentTarget.parentElement;
    group?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  };

  return (
    <div ref={ref} className={className} id={id} role="radiogroup" aria-label="Layout">
      {choices.map((choice, index) => (
        <button
          key={choice.id}
          type="button"
          className={cx(labeled ? 'layout-option' : 'icon-btn', choice.id === selected && 'on')}
          data-layout={choice.id}
          title={labeled ? undefined : choice.label}
          role="radio"
          aria-label={labeled ? undefined : choice.label}
          aria-checked={choice.id === selected}
          tabIndex={choice.id === tabStop ? 0 : -1}
          onClick={() => onSelect(choice.id)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {choice.icon}
          {labeled && <span>{choice.label}</span>}
        </button>
      ))}
    </div>
  );
}
