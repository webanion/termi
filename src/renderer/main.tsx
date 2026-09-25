import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// The stylesheet, in its original order, so the split cannot change which rule wins.
import './styles/base.css';
import './styles/layout.css';
import './styles/header.css';
import './styles/trafficLights.css';
import './styles/buttons.css';
import './styles/sidebar.css';
import './styles/stats.css';
import './styles/terminals.css';
import './styles/dialog.css';
import { init } from './appStore';
import { App } from './App';

// Start-up runs before React: load the settings and start the first terminals. Then render.
void init().then(() => {
  const root = document.getElementById('root');
  if (!root) throw new Error('Missing element: #root');
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  // Turn animations on only after the first layout, so the app does not animate into place.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => document.body.classList.remove('preload')),
  );
});
