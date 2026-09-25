import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import logoMark from '../../assets/logo-mark.svg';
import {
  closeCommandDialog,
  commandById,
  deleteCommand,
  focusActiveTab,
  saveCommand,
} from './appStore';
import { cx } from './cx';
import { CloseIcon, FolderIcon, PlusIcon } from './Icons';
import { useAppState } from './useAppState';
import { MAX_TERMINALS } from '../shared/savedCommands';

interface Field {
  key: number;
  value: string;
}

let nextFieldKey = 1;
const field = (value = ''): Field => ({ key: nextFieldKey++, value });

// The dialog to add or edit a saved command. It opens when the store says so, and plays its
// closing animation before the store closes it.
export function CommandDialog() {
  const dialogState = useAppState((s) => s.dialog);
  const home = useAppState((s) => s.info.home);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const inputs = useRef(new Map<number, HTMLTextAreaElement>());
  const focusField = useRef<number | null>(null);

  const [name, setName] = useState('');
  const [fields, setFields] = useState<Field[]>([field()]);
  const [cwd, setCwd] = useState('');
  const [autoStart, setAutoStart] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [openedToken, setOpenedToken] = useState<number | null>(null);

  const editingId = dialogState?.editingId ?? null;
  const multi = fields.length > 1;
  const token = dialogState?.token ?? null;

  // Each opening fills the form from the command being edited, or leaves it empty for a new one.
  if (dialogState && token !== openedToken) {
    const cmd = dialogState.editingId ? commandById(dialogState.editingId) : undefined;
    setOpenedToken(token);
    setName(cmd?.name ?? '');
    setFields(
      (cmd?.terminals ?? [{ command: '' }]).slice(0, MAX_TERMINALS).map((t) => field(t.command)),
    );
    setCwd(cmd?.cwd ?? '');
    setAutoStart(cmd?.autoStart ?? false);
    setConfirmDelete(false);
  }

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (token === null || !dialog) return;
    if (!dialog.open) dialog.showModal();
    nameRef.current?.focus();
  }, [token]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialogState && dialog?.open) dialog.close();
  }, [dialogState]);

  // Focus the field that was just added, or the one that takes the place of a removed one.
  useEffect(() => {
    if (focusField.current === null) return;
    inputs.current.get(focusField.current)?.focus();
    focusField.current = null;
  }, [fields]);

  const addField = () => {
    if (fields.length >= MAX_TERMINALS) return;
    const added = field();
    focusField.current = added.key;
    setFields([...fields, added]);
  };

  const removeField = (index: number) => {
    const next = fields.filter((_, i) => i !== index);
    focusField.current = next[Math.min(index, next.length - 1)]?.key ?? null;
    setFields(next);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const data = {
      name: name.trim(),
      terminals: fields.map((f) => ({ command: f.value.trim() })),
      cwd: cwd.trim(),
      autoStart,
    };
    if (!data.name || !data.terminals[0]?.command) return;
    await saveCommand(editingId, data);
    closeCommandDialog();
  };

  const onDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (editingId) await deleteCommand(editingId);
    closeCommandDialog();
  };

  const pickFolder = async () => {
    const current = cwd.trim().replace(/^~(?=$|\/)/, home);
    const folder = await window.termi.pickFolder(current || undefined);
    if (folder) {
      setCwd(
        folder === home || folder.startsWith(`${home}/`) ? `~${folder.slice(home.length)}` : folder,
      );
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={cx('dialog', dialogState?.closing && 'closing')}
      id="command-dialog"
      onCancel={(event) => {
        event.preventDefault();
        closeCommandDialog();
      }}
      onClose={() => focusActiveTab()}
    >
      <form
        ref={formRef}
        method="dialog"
        id="command-form"
        autoComplete="off"
        onSubmit={(event) => void onSubmit(event)}
      >
        <div className="dialog-head">
          <img src={logoMark} alt="" className="dialog-logo" />
          <h2 id="command-dialog-title">
            {editingId ? 'Edit saved command' : 'New saved command'}
          </h2>
        </div>

        <label className="field">
          <span className="field-label">Name</span>
          <input
            ref={nameRef}
            type="text"
            name="name"
            placeholder="API server"
            required
            maxLength={60}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <div className="field">
          <span className="field-label" id="command-label">
            {multi ? 'Commands' : 'Command'}
          </span>
          {/* One box per terminal. With more than one, each gets a number and a remove button. */}
          <div
            className={cx('term-fields', multi && 'multi')}
            id="term-fields"
            // Cmd+Enter saves from inside a command box.
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
          >
            {fields.map((f, index) => (
              <div className="term-field" key={f.key}>
                <span className="term-field-num">{index + 1}</span>
                <textarea
                  ref={(el) => {
                    if (el) inputs.current.set(f.key, el);
                    else inputs.current.delete(f.key);
                  }}
                  spellCheck={false}
                  value={f.value}
                  rows={multi ? 2 : 3}
                  required={index === 0}
                  placeholder={index === 0 ? 'npm run dev' : 'Leave empty for a plain shell'}
                  aria-label={multi ? `Command for terminal ${index + 1}` : 'Command'}
                  onChange={(event) =>
                    setFields(
                      fields.map((g) =>
                        g.key === f.key ? { ...g, value: event.target.value } : g,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="icon-btn small"
                  title="Remove this terminal"
                  onClick={() => removeField(index)}
                >
                  <CloseIcon />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="add-term"
            id="add-term-field"
            hidden={fields.length >= MAX_TERMINALS}
            onClick={addField}
          >
            <PlusIcon /> Add terminal
          </button>
          <span className="field-hint">
            Each line runs in order, in your normal shell. Add up to 4 terminals to run them side by
            side in one tab.
          </span>
        </div>

        <div className="field">
          <span className="field-label">Folder</span>
          <div className="field-row">
            <input
              type="text"
              name="cwd"
              placeholder="~"
              spellCheck={false}
              value={cwd}
              onChange={(event) => setCwd(event.target.value)}
            />
            <button
              type="button"
              className="btn"
              id="pick-folder"
              onClick={() => void pickFolder()}
            >
              <FolderIcon /> Choose
            </button>
          </div>
        </div>

        <label className="check">
          <input
            type="checkbox"
            name="autoStart"
            checked={autoStart}
            onChange={(event) => setAutoStart(event.target.checked)}
          />
          <span className="check-box"></span>
          <span>
            <span className="check-title">Start when Termi opens</span>
            <span className="field-hint">Termi runs it in a new tab at launch.</span>
          </span>
        </label>

        <div className="dialog-actions">
          <button
            type="button"
            className={cx('btn danger', confirmDelete && 'confirm')}
            id="delete-command"
            hidden={!editingId}
            onClick={() => void onDelete()}
          >
            {confirmDelete ? 'Click again to delete' : 'Delete'}
          </button>
          <div className="spacer"></div>
          <button type="button" className="btn" id="cancel-command" onClick={closeCommandDialog}>
            Cancel
          </button>
          <button type="submit" className="btn primary" id="save-command">
            Save
          </button>
        </div>
      </form>
    </dialog>
  );
}
