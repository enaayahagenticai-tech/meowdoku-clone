import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rootEl = document.getElementById('root');
if (rootEl) {
  rootEl.textContent = 'Loading...';
}
try {
  createRoot(rootEl!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (err) {
  if (rootEl) rootEl.textContent = 'Failed to start game. Try hard refresh.';
  console.error(err);
}
