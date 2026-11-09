import type { Exercise, WorkoutSet } from '../db'
import { EXERCISE_MUSCLES, GROUP_DEFAULT, MUSCLE_LIST, NAME_RULES, type MuscleId, type Targets } from '../data/muscles'
import { norm } from '../components/exercises'

/** Które mięśnie pracują w ćwiczeniu: wbudowane z tabeli, własne — zgadnięte po nazwie albo po partii. */
export function targetsOf(e: Pick<Exercise, 'name' | 'muscle'>): Targets {
  const known = EXERCISE_MUSCLES[e.name]
  if (known) return known
  const n = norm(e.name)
  for (const [re, t] of NAME_RULES) if (re.test(n)) return t
  return GROUP_DEFAULT[e.muscle]
}

/** Seria na mięsień główny liczy się w całości, na pomocniczy — w połowie. */
export const SECONDARY_WEIGHT = 0.5

export type Volume = Record<MuscleId, number>

export function emptyVolume(): Volume {
  return Object.fromEntries(MUSCLE_LIST.map((m) => [m.id, 0])) as Volume
}

/** Liczba serii na każdy mięsień. Liczą się tylko zrobione serie, bez rozgrzewkowych. */
export function muscleVolume(sets: Pick<WorkoutSet, 'exerciseId' | 'done' | 'type'>[], exercises: Map<number, Exercise>): Volume {
  const v = emptyVolume()
  for (const s of sets) {
    if (!s.done || s.type === 'rozgrzewka') continue
    const e = exercises.get(s.exerciseId)
    if (!e) continue
    const [primary, secondary] = targetsOf(e)
    for (const m of primary) v[m] += 1
    for (const m of secondary) v[m] += SECONDARY_WEIGHT
  }
  return v
}

/**
 * Poziom koloru 0–4 według serii na tydzień (zalecane zwykle ok. 10–20 serii tygodniowo na partię).
 * 0 = nic, 1 = mniej niż 4, 2 = 4–7, 3 = 8–11, 4 = 12 i więcej.
 */
export function level(sets: number, days: number): 0 | 1 | 2 | 3 | 4 {
  const perWeek = (sets * 7) / days
  if (perWeek <= 0) return 0
  if (perWeek < 4) return 1
  if (perWeek < 8) return 2
  if (perWeek < 12) return 3
  return 4
}

/** Ćwiczenia na dany mięsień: najpierw te, gdzie pracuje głównie, potem pomocniczo. */
export function exercisesFor(muscle: MuscleId, all: Exercise[]) {
  const primary: Exercise[] = []
  const secondary: Exercise[] = []
  for (const e of all) {
    const [p, s] = targetsOf(e)
    if (p.includes(muscle)) primary.push(e)
    else if (s.includes(muscle)) secondary.push(e)
  }
  return { primary, secondary }
}

/** „4,5” zamiast „4.5”, liczby całkowite bez przecinka. */
export function fmtSets(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')
}
