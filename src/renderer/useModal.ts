import { useLayoutEffect, useRef } from 'react';

// Keep a <dialog> shown as a modal while `open` holds. A modal dialog keeps the focus inside it,
// and Escape cancels it. It focuses its first control when it opens, so a dialog that should not
// start on a button passes focusSelf, and takes the focus itself.
export function useModal(open: boolean, { focusSelf = false } = {}) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      if (focusSelf) dialog.focus();
    } else if (!open && dialog.open) dialog.close();
  }, [open, focusSelf]);
  return ref;
}
