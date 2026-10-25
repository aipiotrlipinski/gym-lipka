import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope'
import './index.css'
import App from './App.tsx'
import { requestPersistentStorage } from './db'

// Od pierwszego uruchomienia prosimy o trwały zapis danych treningowych.
requestPersistentStorage().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
