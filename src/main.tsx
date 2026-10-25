import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope'
import './index.css'
import App from './App.tsx'
import { ensureSeed, requestPersistentStorage } from './db'

// Od pierwszego uruchomienia prosimy o trwały zapis danych treningowych.
requestPersistentStorage().catch(() => {})
// Baza ćwiczeń i plan startowy przy pierwszym uruchomieniu.
ensureSeed().catch((e) => console.error('Nie udało się wgrać bazy ćwiczeń', e))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
