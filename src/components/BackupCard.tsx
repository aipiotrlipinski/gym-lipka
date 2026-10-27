import { useRef, useState } from 'react'
import { BackupError, backupFileName, exportBackup, parseBackup, restoreBackup, summarize, type Backup } from '../lib/backup'
import { plural } from '../lib/format'
import { isApk, saveTextFile } from '../lib/native'
import { Button, Card, Sheet } from './ui'

function when(ts: number) {
  return new Date(ts).toLocaleString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Ustawienia → Kopia zapasowa: zapis całej bazy do pliku i przywracanie z pliku. */
export function BackupCard() {
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Backup | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function save() {
    setMessage(null)
    setBusy(true)
    try {
      const b = await exportBackup()
      await saveTextFile(backupFileName(b.exportedAt), JSON.stringify(b))
      const n = summarize(b).workouts
      setMessage({
        ok: true,
        text: isApk
          ? `Kopia gotowa (${n} ${plural(n, 'trening', 'treningi', 'treningów')}). Wybierz, gdzie ją zapisać — np. Dysk Google.`
          : `Kopia zapisana w folderze Pobrane (${n} ${plural(n, 'trening', 'treningi', 'treningów')}).`,
      })
    } catch (e) {
      // Zamknięcie okna udostępniania bez wyboru to nie błąd.
      if (!(e instanceof Error && /cancel/i.test(e.message))) setMessage({ ok: false, text: 'Nie udało się zapisać kopii. Spróbuj jeszcze raz.' })
    } finally {
      setBusy(false)
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    setMessage(null)
    try {
      setPending(parseBackup(await file.text()))
    } catch (e) {
      setMessage({ ok: false, text: e instanceof BackupError ? e.message : 'Nie udało się odczytać pliku.' })
    } finally {
      if (input.current) input.current.value = ''
    }
  }

  async function restore() {
    if (!pending) return
    setBusy(true)
    try {
      await restoreBackup(pending)
      const n = summarize(pending).workouts
      setMessage({ ok: true, text: `Przywrócono: ${n} ${plural(n, 'trening', 'treningi', 'treningów')}.` })
      setPending(null)
    } catch {
      setMessage({ ok: false, text: 'Przywracanie się nie udało, dane zostały bez zmian.' })
    } finally {
      setBusy(false)
    }
  }

  const s = pending && summarize(pending)
  return (
    <>
      <Card className="mx-5 flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <span className="text-[15px] font-bold">Kopia zapasowa</span>
          <span className="text-[13px] leading-relaxed text-muted">
            Cała historia, plany, ćwiczenia i masa ciała w jednym pliku. Rób kopię co jakiś czas i trzymaj ją poza telefonem.
          </span>
        </div>
        <Button disabled={busy} onClick={save}>
          {busy && !pending ? 'Zapisuję…' : 'Zapisz kopię'}
        </Button>
        <input ref={input} type="file" accept=".json,application/json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <Button variant="soft" disabled={busy} onClick={() => input.current?.click()}>
          Przywróć z pliku
        </Button>
        {message && (
          <p role="status" className={`m-0 text-[13px] font-bold ${message.ok ? 'text-accent' : 'text-[#C0392B]'}`}>
            {message.text}
          </p>
        )}
      </Card>

      {s && (
        <Sheet title="Przywrócić kopię?" onClose={() => !busy && setPending(null)}>
          <div className="flex flex-col gap-3 px-5 pb-2">
            <p className="m-0 text-[15px] leading-relaxed">
              Kopia z <b>{when(s.exportedAt)}</b>: {s.workouts} {plural(s.workouts, 'trening', 'treningi', 'treningów')},{' '}
              {s.plans} {plural(s.plans, 'plan', 'plany', 'planów')}, {s.body} {plural(s.body, 'pomiar', 'pomiary', 'pomiarów')} masy ciała.
            </p>
            <p className="m-0 rounded-2xl bg-soft px-4 py-3 text-[13px] leading-relaxed text-muted">
              Wszystko, co jest teraz w aplikacji, zostanie zastąpione zawartością kopii.
            </p>
            <Button size="lg" disabled={busy} onClick={restore}>
              {busy ? 'Przywracam…' : 'Przywróć kopię'}
            </Button>
            <Button variant="soft" disabled={busy} onClick={() => setPending(null)}>
              Anuluj
            </Button>
          </div>
        </Sheet>
      )}
    </>
  )
}
