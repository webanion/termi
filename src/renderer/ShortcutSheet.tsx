import { closeOverlay } from './appStore';
import { CloseIcon } from './Icons';
import { shortcutRows } from './shortcutRows';
import { useAppState } from './useAppState';
import { useModal } from './useModal';

export function ShortcutSheet() {
  const open = useAppState((s) => s.overlay === 'shortcuts');
  const platform = useAppState((s) => s.info.platform);
  const ref = useModal(open, { focusSelf: true });

  return (
    <dialog
      ref={ref}
      className="dialog help-dialog"
      tabIndex={-1}
      id="shortcut-sheet"
      aria-labelledby="shortcut-title"
      onCancel={(event) => {
        event.preventDefault();
        closeOverlay();
      }}
    >
      {open && (
        <div className="help-body">
          <div className="dialog-head">
            <h2 id="shortcut-title">Keyboard shortcuts</h2>
            <span className="grow" />
            <button className="icon-btn" aria-label="Close the shortcuts" onClick={closeOverlay}>
              <CloseIcon />
            </button>
          </div>
          <dl className="shortcut-list">
            {shortcutRows(platform).map((row) => (
              <div className="shortcut-row" key={row.label}>
                <dt>{row.label}</dt>
                <dd>
                  <kbd className="keys">{row.keys}</kbd>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </dialog>
  );
}
