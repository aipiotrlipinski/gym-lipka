import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db, type Equipment, type Exercise, type MuscleGroup } from '../db'
import { Button, Sheet, TextField } from './ui'
import { SearchIcon } from './icons'

export const MUSCLES: { id: MuscleGroup; label: string }[] = [
  { id: 'klatka', label: 'Klatka' },
  { id: 'plecy', label: 'Plecy' },
  { id: 'nogi', label: 'Nogi' },
  { id: 'barki', label: 'Barki' },
  { id: 'ramiona', label: 'Ręce' },
  { id: 'brzuch', label: 'Brzuch' },
  { id: 'inne', label: 'Inne' },
]
export const muscleLabel = (m: MuscleGroup) => MUSCLES.find((x) => x.id === m)?.label ?? m

export const EQUIPMENT: Equipment[] = ['sztanga', 'hantle', 'maszyna', 'wyciąg', 'masa ciała', 'inne']
export const equipmentLabel = (e: Equipment) => e.charAt(0).toUpperCase() + e.slice(1)

/** Wyszukiwanie odporne na polskie znaki: „wioslowanie” znajdzie „Wiosłowanie”. */
export function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function useExercises() {
  return useLiveQuery(() => db.exercises.orderBy('name').toArray(), []) ?? []
}

export function useFilteredExercises(query: string, muscle: MuscleGroup | null) {
  const all = useExercises()
  return useMemo(() => {
    const q = norm(query.trim())
    return all
      .filter((e) => (!muscle || e.muscle === muscle) && (!q || q.split(/\s+/).every((w) => norm(e.name).includes(w))))
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
  }, [all, query, muscle])
}

export function SearchBox({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <label className="mx-5 flex h-[52px] items-center gap-2.5 rounded-2xl border border-line bg-card px-4 text-muted">
      <SearchIcon />
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Szukaj ćwiczenia"
        aria-label="Szukaj ćwiczenia"
        className="min-w-0 flex-1 border-0 bg-transparent text-base text-ink outline-none"
      />
    </label>
  )
}

export function MuscleChips({ value, onChange }: { value: MuscleGroup | null; onChange: (m: MuscleGroup | null) => void }) {
  const chip = (active: boolean) =>
    `h-9 shrink-0 rounded-full px-3.5 text-[13px] ${
      active ? 'border-transparent bg-accent font-extrabold text-on-accent' : 'border border-line bg-card font-bold text-ink'
    }`
  return (
    <div className="flex gap-2 overflow-x-auto px-5 pb-1 pt-3" style={{ scrollbarWidth: 'none' }}>
      <button className={chip(value === null)} onClick={() => onChange(null)}>
        Wszystkie
      </button>
      {MUSCLES.map((m) => (
        <button key={m.id} className={chip(value === m.id)} onClick={() => onChange(value === m.id ? null : m.id)}>
          {m.label}
        </button>
      ))}
    </div>
  )
}

/** Arkusz wyboru ćwiczenia z wyszukiwarką (do planu, treningu, zamiany). */
export function ExercisePicker({
  title,
  onPick,
  onClose,
  exclude = [],
}: {
  title: string
  onPick: (e: Exercise) => void
  onClose: () => void
  exclude?: number[]
}) {
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null)
  const [creating, setCreating] = useState(false)
  const list = useFilteredExercises(q, muscle).filter((e) => !exclude.includes(e.id))

  if (creating)
    return (
      <NewExerciseSheet
        initialName={q}
        onClose={() => setCreating(false)}
        onCreated={(e) => {
          onPick(e)
          onClose()
        }}
      />
    )

  return (
    <Sheet title={title} onClose={onClose}>
      <SearchBox value={q} onChange={setQ} />
      <MuscleChips value={muscle} onChange={setMuscle} />
      <div className="mx-5 mt-3 flex flex-col">
        {list.map((e) => (
          <button
            key={e.id}
            onClick={() => {
              onPick(e)
              onClose()
            }}
            className="flex flex-col items-start gap-0.5 border-0 border-b border-solid border-line bg-transparent py-3 text-left"
          >
            <span className="text-[15px] font-bold text-ink">{e.name}</span>
            <span className="text-xs text-muted">
              {muscleLabel(e.muscle)} · {equipmentLabel(e.equipment)}
              {e.custom ? ' · własne' : ''}
            </span>
          </button>
        ))}
        {list.length === 0 && <p className="text-sm text-muted">Nie ma takiego ćwiczenia w bazie.</p>}
        <Button variant="outline" className="my-4" onClick={() => setCreating(true)}>
          + Dodaj własne ćwiczenie{q.trim() ? `: „${q.trim()}”` : ''}
        </Button>
      </div>
    </Sheet>
  )
}

/** Formularz własnego ćwiczenia (nowe albo edycja istniejącego własnego). */
export function NewExerciseSheet({
  initialName = '',
  existing,
  onClose,
  onCreated,
}: {
  initialName?: string
  existing?: Exercise
  onClose: () => void
  onCreated?: (e: Exercise) => void
}) {
  const [name, setName] = useState(existing?.name ?? initialName)
  const [muscle, setMuscle] = useState<MuscleGroup>(existing?.muscle ?? 'inne')
  const [equipment, setEquipment] = useState<Equipment>(existing?.equipment ?? 'inne')
  const [note, setNote] = useState(existing?.note ?? '')
  const chip = (active: boolean) =>
    `h-9 rounded-full px-3 text-[13px] ${
      active ? 'border-transparent bg-accent font-extrabold text-on-accent' : 'border border-line bg-card font-bold text-ink'
    }`

  const save = async () => {
    const data = { name: name.trim(), muscle, equipment, note: note.trim() || undefined, custom: true }
    if (!data.name) return
    if (existing) {
      await db.exercises.update(existing.id, data)
      onClose()
    } else {
      const id = await db.exercises.add(data as Exercise)
      onCreated?.({ ...data, id } as Exercise)
      onClose()
    }
  }

  return (
    <Sheet title={existing ? 'Edytuj ćwiczenie' : 'Nowe ćwiczenie'} onClose={onClose}>
      <div className="flex flex-col gap-4 px-5 pb-2">
        <TextField label="Nazwa" value={name} onChange={setName} autoFocus={!existing} placeholder="np. Wyciskanie na maszynie Hammer" />
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-muted">Partia mięśniowa</span>
          <div className="flex flex-wrap gap-2">
            {MUSCLES.map((m) => (
              <button key={m.id} className={chip(muscle === m.id)} onClick={() => setMuscle(m.id)}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-muted">Sprzęt</span>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map((e) => (
              <button key={e} className={chip(equipment === e)} onClick={() => setEquipment(e)}>
                {equipmentLabel(e)}
              </button>
            ))}
          </div>
        </div>
        <TextField label="Notatka (opcjonalnie)" value={note} onChange={setNote} placeholder="np. ustawienie siedziska: 4" />
        <Button size="lg" disabled={!name.trim()} onClick={save}>
          Zapisz
        </Button>
      </div>
    </Sheet>
  )
}
