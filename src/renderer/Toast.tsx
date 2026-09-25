import { cx } from './cx';
import { useAppState } from './useAppState';

// Shows for a moment after select-to-copy.
export function Toast() {
  const toast = useAppState((s) => s.toast);
  return (
    <div
      className={cx('toast', toast.visible && 'show')}
      id="toast"
      role="status"
      aria-live="polite"
    >
      {toast.text}
    </div>
  );
}
