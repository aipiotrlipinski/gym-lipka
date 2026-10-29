import { useState } from 'react'
import { saveName } from '../lib/prefs'
import { Button, TextField } from '../components/ui'

/** Pierwsze uruchomienie: pytanie o imię (potem „Cześć, imię” na ekranie Start). */
export function Witaj() {
  const [name, setName] = useState('')
  const ok = name.trim().length > 0
  return (
    <form
      className="flex min-h-full flex-col justify-center gap-6 px-6 py-10"
      onSubmit={(e) => {
        e.preventDefault()
        if (ok) saveName(name)
      }}
    >
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-bold tracking-wide text-accent">WITAJ W SIŁCE</span>
        <h1 className="m-0 text-[32px] font-extrabold leading-tight tracking-tight">Jak masz na imię?</h1>
        <p className="m-0 text-[15px] leading-relaxed text-muted">Imię zostaje tylko w tym telefonie. Zmienisz je w Ustawieniach.</p>
      </div>
      <TextField label="Imię" value={name} onChange={setName} placeholder="np. Ania" autoFocus />
      <Button size="lg" type="submit" disabled={!ok}>
        Zaczynamy
      </Button>
    </form>
  )
}
