import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from 'src/app';
import { syncAuthAcrossTabs } from 'src/stores/auth.store';
import { watchSystemTheme } from 'src/stores/theme.store';
import 'src/app.css';

watchSystemTheme();
syncAuthAcrossTabs();

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
