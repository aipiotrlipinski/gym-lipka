import { useEffect, useState } from 'react'
import { requestPersistentStorage } from '../db'
import type { ThemeMode } from '../theme'
import { Card } from '../components/ui'
import { CloseIcon } from '../components/icons'
import { GymRunImport } from '../components/GymRunImport'
import { BackupCard } from '../components/BackupCard'
import { HealthCard } from '../components/HealthCard'

const MODES: { id: ThemeMode; label: string }[] = [
  { id: 'system', label: 'Systemowy' },
  { id: 'light', label: 'Jasny' },
  { id: 'dark', label: 'Ciemny' },
]

export function Settings({
  mode,
  setMode,
  onClose,
}: {
  mode: ThemeMode
  setMode: (m: ThemeMode) => void
  onClose: () => void
}) {
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    requestPersistentStorage().then(setPersisted)
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-bg pb-8">
      <div className="flex items-center justify-between px-5 pb-2 pt-6">
        <h1 className="m-0 text-[28px] font-extrabold tracking-tight">Ustawienia</h1>
        <button
          onClick={onClose}
          aria-label="Zamknij ustawienia"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-card text-ink"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="px-5 pb-2 pt-4 text-[13px] font-bold tracking-wide text-muted">MOTYW</div>
      <div role="radiogroup" aria-label="Motyw" className="mx-5 grid grid-cols-3 gap-1 rounded-2xl bg-soft p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="radio"
            aria-checked={mode === m.id}
            onClick={() => setMode(m.id)}
            className={`h-11 rounded-xl border-0 text-sm ${
              mode === m.id ? 'bg-card font-extrabold text-ink' : 'bg-transparent font-bold text-muted'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="px-5 pb-2 pt-6 text-[13px] font-bold tracking-wide text-muted">DANE</div>
      <Card className="mx-5 flex flex-col">
        <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
          <span className="text-[15px] font-bold">Trwały zapis w telefonie</span>
          <span className={`text-[13px] font-bold ${persisted ? 'text-accent' : 'text-muted'}`}>
            {persisted === null ? 'sprawdzam…' : persisted ? 'włączony' : 'po instalacji'}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-[15px] font-bold">Połączenie z internetem</span>
          <span className="text-[13px] font-bold text-muted">{online ? 'jest' : 'brak — działamy offline'}</span>
        </div>
      </Card>
      <p className="mx-5 mt-3 text-[13px] leading-relaxed text-muted">
        Wszystkie dane zostają w tym telefonie — dlatego rób kopię zapasową.
      </p>

      <div className="px-5 pb-2 pt-6 text-[13px] font-bold tracking-wide text-muted">GOOGLE FIT</div>
      <HealthCard />

      <div className="px-5 pb-2 pt-6 text-[13px] font-bold tracking-wide text-muted">KOPIA ZAPASOWA</div>
      <BackupCard />

      <div className="px-5 pb-2 pt-6 text-[13px] font-bold tracking-wide text-muted">IMPORT</div>
      <GymRunImport />

      <p className="mx-5 mt-6 text-xs text-muted">Gym Lipka · wersja {__APP_VERSION__}</p>
    </div>
  )
}
