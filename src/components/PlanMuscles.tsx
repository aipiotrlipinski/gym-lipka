import { useMemo, useState } from 'react'
import type { Exercise } from '../db'
import { MUSCLE_LIST, muscleById, muscleIndex, type MuscleId } from '../data/muscles'
import { planExercisesFor, planRoles } from '../lib/muscleMap'
import { navigate } from '../router'
import { BodyMap, LEVEL_FILL } from './BodyMap'
import { Card } from './ui'
import { ChevronIcon } from './icons'

/** Kolor na mapie: mięsień główny — pełny akcent, pomocniczy — jasny, reszta — szara. */
const ROLE_LEVEL = [0, 2, 4] as const

function useLevels(exerciseIds: number[], exercises: Exercise[]) {
  const key = exerciseIds.join(',')
  return useMemo(() => {
    const roles = planRoles(exerciseIds, new Map(exercises.map((e) => [e.id, e])))
    const levels = Object.fromEntries(MUSCLE_LIST.map((m) => [m.id, ROLE_LEVEL[roles[m.id]]])) as Record<MuscleId, number>
    return { roles, levels }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, exercises])
}

/** Mała sylwetka przód + tył z mięśniami pracującymi w planie (do listy planów). */
export function PlanMusclesThumb({ exerciseIds, exercises, height = 64 }: { exerciseIds: number[]; exercises: Exercise[]; height?: number }) {
  const { levels } = useLevels(exerciseIds, exercises)
  return (
    <div className="flex shrink-0 gap-0.5" aria-hidden="true">
      <BodyMap side="przod" levels={levels} selected={null} style={{ height, width: height * 0.52 }} />
      <BodyMap side="tyl" levels={levels} selected={null} style={{ height, width: height * 0.52 }} />
    </div>
  )
}

function Legend() {
  return (
    <div className="flex items-center justify-center gap-3 text-[11px] font-bold text-muted">
      <span className="flex items-center gap-1">
        <span className="h-3 w-3 rounded-[4px]" style={{ background: LEVEL_FILL[4] }} />
        główne
      </span>
      <span className="flex items-center gap-1">
        <span className="h-3 w-3 rounded-[4px]" style={{ background: LEVEL_FILL[2] }} />
        pomocnicze
      </span>
    </div>
  )
}

/**
 * Sylwetka przód + tył z mięśniami, które pracują w ćwiczeniach planu (dnia albo całego planu).
 * Stuknięcie mięśnia pokazuje, które ćwiczenia z tego planu go trenują.
 */
export function PlanMuscles({ exerciseIds, exercises }: { exerciseIds: number[]; exercises: Exercise[] }) {
  const { roles, levels } = useLevels(exerciseIds, exercises)
  const [selected, setSelected] = useState<MuscleId | null>(null)
  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  if (exerciseIds.length === 0) {
    return <p className="mx-4 my-0 text-[13px] text-muted">Dodaj ćwiczenia — tu zobaczysz, które mięśnie pracują.</p>
  }

  const worked = MUSCLE_LIST.filter((m) => roles[m.id] > 0)
  const toggle = (m: MuscleId) => setSelected((cur) => (cur === m ? null : m))
  const lists = selected ? planExercisesFor(selected, exerciseIds, byId) : null
  const h = 'min(34vh, 260px)'

  return (
    <Card className="mx-4 flex flex-col gap-2 p-3">
      <div className="flex justify-center gap-2">
        <BodyMap side="przod" levels={levels} selected={selected} onSelect={toggle} zoom={false} style={{ height: h, width: '46%' }} />
        <BodyMap side="tyl" levels={levels} selected={selected} onSelect={toggle} zoom={false} style={{ height: h, width: '46%' }} />
      </div>
      <Legend />

      {selected && lists ? (
        <div className="flex flex-col gap-1 rounded-xl bg-row p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[15px] font-extrabold text-ink">{muscleById(selected).label}</span>
            <button
              onClick={() => navigate({ name: 'miesnie', id: muscleIndex(selected) })}
              className="flex items-center gap-0.5 border-0 bg-transparent p-0 text-xs font-bold text-accent"
            >
              mapa mięśni <ChevronIcon />
            </button>
          </div>
          {lists.primary.length + lists.secondary.length === 0 ? (
            <span className="text-[13px] text-muted">Żadne ćwiczenie z tego planu go nie trenuje.</span>
          ) : (
            <>
              {lists.primary.map((e) => (
                <span key={e.id} className="text-[13px] text-ink">
                  <b className="font-extrabold">●</b> {e.name}
                </span>
              ))}
              {lists.secondary.map((e) => (
                <span key={e.id} className="text-[13px] text-muted">
                  ○ {e.name} <span className="text-[11px]">(pomocniczo)</span>
                </span>
              ))}
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-1">
          {worked.map((m) => (
            <button
              key={m.id}
              onClick={() => toggle(m.id)}
              className={`h-7 rounded-full border-0 px-2.5 text-[11px] font-bold ${
                roles[m.id] === 2 ? 'bg-accent text-on-accent' : 'bg-soft text-muted'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}
