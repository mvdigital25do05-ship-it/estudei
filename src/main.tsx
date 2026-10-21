import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Load the authenticated app only outside the synthetic UI fixture.
import './index.css';

const root = createRoot(document.getElementById('root')!);

// The synthetic UI fixture can only be loaded on Vite's dev server with an
// explicit flag. Production builds always load the authenticated application.
if (import.meta.env.DEV &&
    import.meta.env.VITE_ESTUDEI_UI_TESTS === 'true' &&
    new URLSearchParams(window.location.search).get('ui-test') === '1') {
  void import('./UiTestHarness').then(({default: UiTestHarness}) => {
    root.render(<StrictMode><UiTestHarness/></StrictMode>);
  });
} else {
  void import('./App.tsx').then(({default:App}) => {
    root.render(<StrictMode><App/></StrictMode>);
  });
}
