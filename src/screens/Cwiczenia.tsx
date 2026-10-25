import { useState } from 'react'
import type { MuscleGroup } from '../db'
import { navigate } from '../router'
import { Badge, Button, ScreenTitle } from '../components/ui'
import { ChevronIcon } from '../components/icons'
import {
  MuscleChips,
  NewExerciseSheet,
  SearchBox,
  equipmentLabel,
  muscleLabel,
  useFilteredExercises,
} from '../components/exercises'

export function Cwiczenia() {
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null)
  const [creating, setCreating] = useState(false)
  const list = useFilteredExercises(q, muscle)

  // Grupowanie po partii mięśniowej, gdy nie ma filtra.
  const groups = new Map<MuscleGroup, typeof list>()
  for (const e of list) groups.set(e.muscle, [...(groups.get(e.muscle) ?? []), e])

  return (
    <div className="pb-6">
      <ScreenTitle
        action={
          <Button variant="outline" onClick={() => setCreating(true)} className="!rounded-full">
            + Własne
          </Button>
        }
      >
        Ćwiczenia
      </ScreenTitle>
      <div className="pt-3">
        <SearchBox value={q} onChange={setQ} />
      </div>
      <MuscleChips value={muscle} onChange={setMuscle} />

      {[...groups.entries()].map(([m, items]) => (
        <div key={m}>
          <div className="px-5 pb-2 pt-5 text-[13px] font-bold tracking-wide text-muted">
            {muscleLabel(m).toUpperCase()} · {items.length}
          </div>
          <div className="mx-5 overflow-hidden rounded-[20px] border border-line bg-card">
            {items.map((e, i) => (
              <button
                key={e.id}
                onClick={() => navigate({ name: 'cwiczenie', id: e.id })}
                className={`flex w-full items-center justify-between gap-3 border-0 bg-transparent px-4 py-3.5 text-left ${
                  i < items.length - 1 ? 'border-b border-solid border-line' : ''
                }`}
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[15px] font-bold text-ink">{e.name}</span>
                  <span className="text-xs text-muted">{equipmentLabel(e.equipment)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted">
                  {e.custom && <Badge tone="soft">własne</Badge>}
                  <ChevronIcon />
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
      {list.length === 0 && (
        <p className="mx-5 mt-6 text-sm text-muted">
          Brak wyników. Dodaj własne ćwiczenie przyciskiem „+ Własne”.
        </p>
      )}
      {creating && <NewExerciseSheet initialName={q} onClose={() => setCreating(false)} />}
    </div>
  )
}
