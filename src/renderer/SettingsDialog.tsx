import { useState, type ReactNode } from 'react';
import {
  closeOverlay,
  resetAllSettings,
  setCursorBlink,
  setCursorStyle,
  setFontSize,
  setOpenAtLogin,
  setSidebarHidden,
  setWordWrap,
} from './appStore';
import { cx } from './cx';
import { CloseIcon, MinusIcon, PlusIcon, ResetIcon } from './Icons';
import { useAppState } from './useAppState';
import { useModal } from './useModal';
import { CURSOR_STYLES, DEFAULT_SETTINGS, FONT_SIZE_MAX, FONT_SIZE_MIN } from '@/shared/settings';
import { shortcutLabel } from '@/shared/shortcuts';
import type { CursorStyle } from '@/shared/types';

type Section = 'general' | 'terminal';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'terminal', label: 'Terminal' },
];

const CURSOR_NAMES: Record<CursorStyle, string> = {
  bar: 'Bar',
  block: 'Block',
  underline: 'Underline',
};

const onOff = (on: boolean) => (on ? 'On' : 'Off');

interface RowProps {
  id: string;
  label: string;
  hint?: string;
  defaultText: string;
  isDefault: boolean;
  onReset: () => void;
  children: ReactNode;
}

// One setting: its name, a hint that ends with its default, its control, and a button that
// puts the default back while the setting differs from it.
function SettingRow({ id, label, hint, defaultText, isDefault, onReset, children }: RowProps) {
  return (
    <div className="setting-row" id={`setting-${id}`}>
      <div className="setting-text">
        <span className="setting-label" id={`setting-${id}-label`}>
          {label}
        </span>
        <span className="field-hint">
          {hint ? `${hint} ` : ''}Default: {defaultText}.
        </span>
      </div>
      <div className="setting-control">
        {children}
        <button
          type="button"
          className="icon-btn setting-reset"
          title="Back to the default"
          aria-label={`Put ${label} back to the default`}
          disabled={isDefault}
          onClick={onReset}
        >
          <ResetIcon />
        </button>
      </div>
    </div>
  );
}

function Switch({
  checked,
  labelledBy,
  onChange,
}: {
  checked: boolean;
  labelledBy: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      className={cx('switch', checked && 'on')}
      aria-checked={checked}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!checked)}
    >
      <span className="switch-knob"></span>
    </button>
  );
}

// The settings panel. Every change applies and saves at once, and a change to settings.json
// from outside shows here as soon as the app reads it.
export function SettingsDialog() {
  const open = useAppState((s) => s.overlay === 'settings');
  const settings = useAppState((s) => s.settings);
  const openAtLogin = useAppState((s) => s.openAtLogin);
  const platform = useAppState((s) => s.info.platform);
  const ref = useModal(open, { focusSelf: true });
  const [section, setSection] = useState<Section>('general');

  const keys = (action: Parameters<typeof shortcutLabel>[0]) => shortcutLabel(action, platform);
  const { fontSize, cursorStyle, cursorBlink, wordWrap, sidebarHidden } = settings;
  const allDefault =
    fontSize === DEFAULT_SETTINGS.fontSize &&
    cursorStyle === DEFAULT_SETTINGS.cursorStyle &&
    cursorBlink === DEFAULT_SETTINGS.cursorBlink &&
    wordWrap === DEFAULT_SETTINGS.wordWrap &&
    sidebarHidden === DEFAULT_SETTINGS.sidebarHidden &&
    !openAtLogin;

  return (
    <dialog
      ref={ref}
      className="dialog help-dialog"
      tabIndex={-1}
      id="settings-dialog"
      aria-labelledby="settings-title"
      onCancel={(event) => {
        event.preventDefault();
        closeOverlay();
      }}
    >
      {open && (
        <div className="help-body">
          <div className="dialog-head">
            <h2 id="settings-title">Settings</h2>
            <button className="icon-btn" aria-label="Close the settings" onClick={closeOverlay}>
              <CloseIcon />
            </button>
          </div>
          <div className="settings-layout">
            <div className="settings-nav" role="tablist" aria-orientation="vertical">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  id={`settings-tab-${s.id}`}
                  className={cx('settings-tab', s.id === section && 'on')}
                  aria-selected={s.id === section}
                  aria-controls="settings-page"
                  onClick={() => setSection(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div
              className="settings-page"
              id="settings-page"
              role="tabpanel"
              aria-labelledby={`settings-tab-${section}`}
            >
              {section === 'general' && (
                <>
                  <SettingRow
                    id="sidebar"
                    label="Show the sidebar"
                    hint={`${keys('toggle-sidebar')} shows and hides it too.`}
                    defaultText={onOff(!DEFAULT_SETTINGS.sidebarHidden)}
                    isDefault={sidebarHidden === DEFAULT_SETTINGS.sidebarHidden}
                    onReset={() => setSidebarHidden(DEFAULT_SETTINGS.sidebarHidden)}
                  >
                    <Switch
                      checked={!sidebarHidden}
                      labelledBy="setting-sidebar-label"
                      onChange={(shown) => setSidebarHidden(!shown)}
                    />
                  </SettingRow>
                  {/* Only macOS can open Termi at login. Elsewhere main answers null. */}
                  {openAtLogin !== null && (
                    <SettingRow
                      id="login"
                      label="Open at login"
                      hint="Termi starts when you log in to your Mac."
                      defaultText={onOff(false)}
                      isDefault={!openAtLogin}
                      onReset={() => void setOpenAtLogin(false)}
                    >
                      <Switch
                        checked={openAtLogin}
                        labelledBy="setting-login-label"
                        onChange={(on) => void setOpenAtLogin(on)}
                      />
                    </SettingRow>
                  )}
                </>
              )}
              {section === 'terminal' && (
                <>
                  <SettingRow
                    id="font-size"
                    label="Text size"
                    hint={`From ${FONT_SIZE_MIN} to ${FONT_SIZE_MAX}. ${keys('font-bigger')} and ${keys('font-smaller')} change it too.`}
                    defaultText={String(DEFAULT_SETTINGS.fontSize)}
                    isDefault={fontSize === DEFAULT_SETTINGS.fontSize}
                    onReset={() => setFontSize(DEFAULT_SETTINGS.fontSize)}
                  >
                    <div className="stepper" role="group" aria-labelledby="setting-font-size-label">
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="Smaller text"
                        disabled={fontSize <= FONT_SIZE_MIN}
                        onClick={() => setFontSize(fontSize - 1)}
                      >
                        <MinusIcon />
                      </button>
                      <output className="stepper-value" aria-live="polite">
                        {fontSize}
                      </output>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="Bigger text"
                        disabled={fontSize >= FONT_SIZE_MAX}
                        onClick={() => setFontSize(fontSize + 1)}
                      >
                        <PlusIcon />
                      </button>
                    </div>
                  </SettingRow>
                  <SettingRow
                    id="cursor-style"
                    label="Cursor"
                    defaultText={CURSOR_NAMES[DEFAULT_SETTINGS.cursorStyle]}
                    isDefault={cursorStyle === DEFAULT_SETTINGS.cursorStyle}
                    onReset={() => setCursorStyle(DEFAULT_SETTINGS.cursorStyle)}
                  >
                    <div
                      className="segmented"
                      role="radiogroup"
                      aria-labelledby="setting-cursor-style-label"
                    >
                      {CURSOR_STYLES.map((style) => (
                        <button
                          key={style}
                          type="button"
                          role="radio"
                          className={cx(style === cursorStyle && 'on')}
                          data-cursor={style}
                          aria-checked={style === cursorStyle}
                          onClick={() => setCursorStyle(style)}
                        >
                          {CURSOR_NAMES[style]}
                        </button>
                      ))}
                    </div>
                  </SettingRow>
                  <SettingRow
                    id="cursor-blink"
                    label="Blink the cursor"
                    defaultText={onOff(DEFAULT_SETTINGS.cursorBlink)}
                    isDefault={cursorBlink === DEFAULT_SETTINGS.cursorBlink}
                    onReset={() => setCursorBlink(DEFAULT_SETTINGS.cursorBlink)}
                  >
                    <Switch
                      checked={cursorBlink}
                      labelledBy="setting-cursor-blink-label"
                      onChange={setCursorBlink}
                    />
                  </SettingRow>
                  <SettingRow
                    id="word-wrap"
                    label="Wrap long lines"
                    hint={`How a new terminal starts. ${keys('toggle-word-wrap')} turns it on and off in the focused terminal.`}
                    defaultText={onOff(DEFAULT_SETTINGS.wordWrap)}
                    isDefault={wordWrap === DEFAULT_SETTINGS.wordWrap}
                    onReset={() => setWordWrap(DEFAULT_SETTINGS.wordWrap)}
                  >
                    <Switch
                      checked={wordWrap}
                      labelledBy="setting-word-wrap-label"
                      onChange={setWordWrap}
                    />
                  </SettingRow>
                </>
              )}
            </div>
          </div>
          <div className="dialog-actions">
            <button
              type="button"
              className="btn"
              id="settings-reset-all"
              disabled={allDefault}
              onClick={resetAllSettings}
            >
              Reset all
            </button>
            <span className="grow" />
            <button type="button" className="btn primary" onClick={closeOverlay}>
              Done
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
