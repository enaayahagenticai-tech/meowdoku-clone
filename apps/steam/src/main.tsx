import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/platform'
import '../src/App.css'
import App from '../src/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
