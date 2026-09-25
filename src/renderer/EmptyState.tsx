import logo from '../../assets/logo.svg';
import { openCommandDialog, openTab } from './appStore';
import { useAppState } from './useAppState';
import { shortcutLabel } from '../shared/shortcuts';

export function EmptyState({ hidden }: { hidden: boolean }) {
  const platform = useAppState((s) => s.info.platform);
  return (
    <div className="empty-state" id="empty-state" hidden={hidden}>
      <img src={logo} alt="Termi logo" className="empty-logo" />
      <h1>Termi</h1>
      <p>No terminals are running.</p>
      <div className="empty-actions">
        <button className="btn primary" id="empty-new-terminal" onClick={() => openTab()}>
          New terminal <kbd>{shortcutLabel('new-terminal', platform)}</kbd>
        </button>
        <button className="btn" id="empty-new-command" onClick={() => openCommandDialog()}>
          Save a command
        </button>
      </div>
    </div>
  );
}
