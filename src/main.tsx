import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rootEl = document.getElementById('root');
if (rootEl) {
  rootEl.textContent = 'Loading...';
}

function MinimalApp() {
  return (
    <div style={{padding: 24, color: '#000'}}>
      <h1>Meowdoku</h1>
      <p>Diagnostic mount: React renders here.</p>
      <button id="diag-full">Load full app</button>
      <button id="diag-error">Throw test error</button>
    </div>
  );
}

document.getElementById('diag-full')?.addEventListener('click', () => createRoot(document.getElementById('root')!).render(<App />));
document.getElementById('diag-error')?.addEventListener('click', () => { throw new Error('diagnostic error from React render'); });

try {
  createRoot(rootEl!).render(
    <StrictMode>
      <MinimalApp />
    </StrictMode>,
  );
} catch (err: any) {
  if (rootEl) rootEl.textContent = 'Failed to start game: ' + (err?.message || err);
  console.error(err);
}
