import { useEffect, useState } from 'react'
import { requestPersistentStorage } from '../db'
import { PALETTES, usePalette, type ThemeMode } from '../theme'
import { saveName, useName } from '../lib/prefs'
import { Card, SavedTextField } from '../components/ui'
import { CloseIcon } from '../components/icons'
import { GymRunImport } from '../components/GymRunImport'
import { BackupCard } from '../components/BackupCard'
import { HealthCard } from '../components/HealthCard'
import { LockScreenCard } from '../components/LockScreenCard'

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
  const name = useName()
  const [palette, setPalette] = usePalette()

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

      <div className="px-5 pt-2">
        <SavedTextField label="Imię" value={name ?? ''} onSave={(v) => v.trim() && saveName(v)} />
      </div>

      <div className="px-5 pb-2 pt-6 text-[13px] font-bold tracking-wide text-muted">MOTYW</div>
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

      <div className="px-5 pb-2 pt-6 text-[13px] font-bold tracking-wide text-muted">KOLORYSTYKA</div>
      <div role="radiogroup" aria-label="Kolorystyka" className="mx-5 grid grid-cols-2 gap-2">
        {PALETTES.map((p) => {
          const on = palette === p.id
          return (
            <button
              key={p.id}
              role="radio"
              aria-checked={on}
              onClick={() => setPalette(p.id)}
              className={`flex items-center gap-3 rounded-2xl border-2 border-solid bg-card px-3 py-2.5 text-left ${on ? 'border-accent' : 'border-line'}`}
            >
              <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-solid border-line" style={{ background: p.swatch[0] }} aria-hidden>
                <span className="absolute bottom-0 right-0 h-5 w-5 rounded-tl-full" style={{ background: p.swatch[2] }} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className={`text-sm ${on ? 'font-extrabold text-ink' : 'font-bold text-ink'}`}>{p.label}</span>
                <span className="truncate text-[11px] text-muted">{p.hint}</span>
              </span>
            </button>
          )
        })}
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

      <LockScreenCard />

      <div className="px-5 pb-2 pt-6 text-[13px] font-bold tracking-wide text-muted">KOPIA ZAPASOWA</div>
      <BackupCard />

      <div className="px-5 pb-2 pt-6 text-[13px] font-bold tracking-wide text-muted">IMPORT</div>
      <GymRunImport />

      <p className="mx-5 mt-6 text-xs text-muted">Siłka · wersja {__APP_VERSION__}</p>
    </div>
  )
}
