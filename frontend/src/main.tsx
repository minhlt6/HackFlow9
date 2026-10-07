import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initRealtimeSync } from './store/realtimeSync.ts'

// Initialize real-time cross-tab auto-sync
initRealtimeSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
