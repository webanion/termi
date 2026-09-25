import logo from '../../assets/logo.svg';
import { modKey, openCommandDialog, openTab } from './appStore';
import { useAppState } from './useAppState';

export function EmptyState({ hidden }: { hidden: boolean }) {
  const info = useAppState((s) => s.info);
  return (
    <div className="empty-state" id="empty-state" hidden={hidden}>
      <img src={logo} alt="Termi logo" className="empty-logo" />
      <h1>Termi</h1>
      <p>No terminals are running.</p>
      <div className="empty-actions">
        <button className="btn primary" id="empty-new-terminal" onClick={() => openTab()}>
          New terminal <kbd>{modKey(info)}T</kbd>
        </button>
        <button className="btn" id="empty-new-command" onClick={() => openCommandDialog()}>
          Save a command
        </button>
      </div>
    </div>
  );
}
