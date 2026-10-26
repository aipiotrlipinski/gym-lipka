import { useRef, useState } from 'react'
import { GymRunError, importGymRun, previewGymRun, type ImportPreview } from '../lib/gymrun'
import { plural, thousands } from '../lib/format'
import { Button, Card, Sheet } from './ui'

function day(ts: number) {
  return new Date(ts).toLocaleDateString('pl-PL', { day: 'numeric', month: 'numeric', year: 'numeric' })
}

/** Ustawienia → Import z GymRun: wybór pliku CSV, podgląd, zapis. */
export function GymRunImport() {
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function onFile(file: File | undefined) {
    if (!file) return
    setMessage(null)
    setBusy(true)
    try {
      setPreview(await previewGymRun(await file.text()))
    } catch (e) {
      setMessage({ ok: false, text: e instanceof GymRunError ? e.message : 'Nie udało się odczytać pliku.' })
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  async function run() {
    if (!preview) return
    setBusy(true)
    try {
      const n = await importGymRun(preview)
      setMessage({ ok: true, text: `Gotowe: ${n} ${plural(n, 'trening', 'treningi', 'treningów')} w historii.` })
      setPreview(null)
    } catch {
      setMessage({ ok: false, text: 'Import się nie udał, nic nie zostało zapisane. Spróbuj jeszcze raz.' })
    } finally {
      setBusy(false)
    }
  }

  const p = preview
  return (
    <>
      <Card className="mx-5 flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <span className="text-[15px] font-bold">Import z GymRun</span>
          <span className="text-[13px] leading-relaxed text-muted">
            W GymRun wyeksportuj dane do CSV i wybierz tu ten plik. Treningi, które już są w aplikacji, zostaną pominięte.
          </span>
        </div>
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv,text/plain,text/comma-separated-values"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <Button variant="soft" disabled={busy} onClick={() => input.current?.click()}>
          {busy && !p ? 'Czytam plik…' : 'Wybierz plik CSV'}
        </Button>
        {message && (
          <p role="status" className={`m-0 text-[13px] font-bold ${message.ok ? 'text-accent' : 'text-[#C0392B]'}`}>
            {message.text}
          </p>
        )}
      </Card>

      {p && (
        <Sheet title="Import z GymRun" onClose={() => !busy && setPreview(null)}>
          <div className="flex flex-col gap-3 px-5 pb-2">
            {p.fresh.length === 0 ? (
              <p className="m-0 text-[15px] leading-relaxed text-muted">
                Wszystkie treningi z tego pliku ({p.workouts.length}) są już w aplikacji. Nie ma czego dodać.
              </p>
            ) : (
              <>
                <p className="m-0 text-[15px] leading-relaxed text-ink">
                  <b>
                    {p.fresh.length} {plural(p.fresh.length, 'trening', 'treningi', 'treningów')}, {thousands(p.sets)}{' '}
                    {plural(p.sets, 'seria', 'serie', 'serii')}
                  </b>{' '}
                  z okresu {day(p.from)} – {day(p.to)}.
                </p>
                {p.skipped > 0 && (
                  <p className="m-0 text-sm text-muted">
                    {p.skipped} {plural(p.skipped, 'trening już jest', 'treningi już są', 'treningów już jest')} w aplikacji — pominę.
                  </p>
                )}
                {p.newExercises.length > 0 && (
                  <p className="m-0 text-sm leading-relaxed text-muted">
                    Nowe ćwiczenia w bazie: {p.newExercises.join(', ')}.
                  </p>
                )}
              </>
            )}
            {p.fresh.length > 0 && (
              <Button size="lg" disabled={busy} onClick={run}>
                {busy ? 'Importuję…' : 'Importuj'}
              </Button>
            )}
            <Button variant="ghost" disabled={busy} onClick={() => setPreview(null)}>
              {p.fresh.length > 0 ? 'Anuluj' : 'Zamknij'}
            </Button>
          </div>
        </Sheet>
      )}
    </>
  )
}
