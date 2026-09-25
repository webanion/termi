import { useEffect, useRef, useState } from 'react';
import { DURATION } from './theme';

export type Presence = 'entering' | 'present' | 'leaving';

export interface PresentItem<T> {
  key: string | number;
  item: T;
  presence: Presence;
}

// The rows to show for `items`, given the rows shown before. Current items keep their order and
// their presence. A new row enters, unless `animate` is off. A row that went away stays where it
// was, leaving.
function merge<T>(
  previous: PresentItem<T>[],
  items: T[],
  keyOf: (item: T) => string | number,
  animate: boolean,
): PresentItem<T>[] {
  const keys = new Set(items.map(keyOf));
  const next: PresentItem<T>[] = items.map((item) => {
    const key = keyOf(item);
    const before = previous.find((entry) => entry.key === key);
    const presence: Presence = !before
      ? animate
        ? 'entering'
        : 'present'
      : before.presence === 'leaving'
        ? 'present'
        : before.presence;
    return { key, item, presence };
  });
  previous.forEach((entry, index) => {
    if (!keys.has(entry.key))
      next.splice(Math.min(index, next.length), 0, { ...entry, presence: 'leaving' });
  });
  return next;
}

// Keep list rows on screen long enough to animate, the way the sidebar lists always have: a new
// row is marked 'entering' for one animation, and a removed row stays, marked 'leaving', until it
// has faded out. Rows that stay keep their element, so hover and active styles animate instead
// of jumping. Nothing enters while the app first lays itself out (body.preload).
export function usePresence<T>(items: T[], keyOf: (item: T) => string | number): PresentItem<T>[] {
  const [shown, setShown] = useState<PresentItem<T>[]>(() =>
    items.map((item) => ({ key: keyOf(item), item, presence: 'present' })),
  );
  const [seen, setSeen] = useState(items);
  const timers = useRef(new Map<string | number, ReturnType<typeof setTimeout>>());

  let current = shown;
  if (items !== seen) {
    current = merge(shown, items, keyOf, !document.body.classList.contains('preload'));
    setSeen(items);
    setShown(current);
  }

  useEffect(() => {
    const pending = timers.current;
    for (const { key, presence } of shown) {
      if (presence === 'present' || pending.has(key)) continue;
      pending.set(
        key,
        setTimeout(() => {
          pending.delete(key);
          setShown((list) =>
            presence === 'leaving'
              ? list.filter((e) => !(e.key === key && e.presence === 'leaving'))
              : list.map((e) =>
                  e.key === key && e.presence === 'entering' ? { ...e, presence: 'present' } : e,
                ),
          );
        }, DURATION),
      );
    }
  }, [shown]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  return current;
}
