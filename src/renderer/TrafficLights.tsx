import { isMac } from './appStore';
import { LightCloseIcon, LightMaximizeIcon, LightMinimizeIcon } from './Icons';
import { useAppState } from './useAppState';

// Drawn window controls for Windows and Linux. macOS keeps its own.
export function TrafficLights() {
  const info = useAppState((s) => s.info);
  if (isMac(info)) return null;
  return (
    <div className="traffic-lights" id="traffic-lights">
      <button
        className="light close"
        data-action="close"
        aria-label="Close window"
        onClick={() => window.termi.window.close()}
      >
        <LightCloseIcon />
      </button>
      <button
        className="light minimize"
        data-action="minimize"
        aria-label="Minimize window"
        onClick={() => window.termi.window.minimize()}
      >
        <LightMinimizeIcon />
      </button>
      <button
        className="light maximize"
        data-action="maximize"
        aria-label="Maximize window"
        onClick={() => window.termi.window.toggleMaximize()}
      >
        <LightMaximizeIcon />
      </button>
    </div>
  );
}
