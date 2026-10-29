import { db, type WorkoutSet } from '../db'
import { e1rm, volume } from './format'

/** Zakończone treningi zawierające ćwiczenie, od najnowszego. */
async function finishedWorkoutsWith(exerciseId: number, excludeWorkoutId?: number) {
  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray()
  const ids = [...new Set(sets.map((s) => s.workoutId))].filter((id) => id !== excludeWorkoutId)
  const workouts = (await db.workouts.bulkGet(ids)).filter((w) => w && w.status === 'zakończony')
  return { sets, workouts: workouts.sort((a, b) => b!.startedAt - a!.startedAt) as NonNullable<(typeof workouts)[number]>[] }
}

/** Serie tego ćwiczenia z ostatniego zakończonego treningu (do podpowiedzi „poprzednio”). */
export async function lastSessionSets(exerciseId: number, excludeWorkoutId?: number): Promise<WorkoutSet[]> {
  const { sets, workouts } = await finishedWorkoutsWith(exerciseId, excludeWorkoutId)
  const last = workouts[0]
  if (!last) return []
  return sets.filter((s) => s.workoutId === last.id).sort((a, b) => a.order - b.order)
}

/** Ciężar serii roboczych z ostatniego treningu z tym ćwiczeniem (najcięższa seria) albo undefined. */
export async function lastWorkingWeight(exerciseId: number): Promise<number | undefined> {
  const work = (await lastSessionSets(exerciseId)).filter((s) => s.type !== 'rozgrzewka')
  return work.length ? Math.max(...work.map((s) => s.weightKg)) : undefined
}

/** Cele z ostatniego treningu (najlepsza seria robocza): ciężar, czas i dystans — podpowiedź do planu. */
export async function lastWorkingTargets(exerciseId: number): Promise<{ weightKg?: number; durationSec?: number; distanceM?: number }> {
  const work = (await lastSessionSets(exerciseId)).filter((s) => s.type !== 'rozgrzewka')
  if (!work.length) return {}
  const top = (xs: (number | undefined)[]) => {
    const v = xs.filter((x): x is number => x !== undefined && x > 0)
    return v.length ? Math.max(...v) : undefined
  }
  return {
    weightKg: Math.max(...work.map((s) => s.weightKg)),
    durationSec: top(work.map((s) => s.durationSec)),
    distanceM: top(work.map((s) => s.distanceM)),
  }
}

export interface Bests {
  maxWeight: number
  maxWeightReps: number
  bestE1rm: number
  /** Najwięcej powtórzeń przy danym ciężarze: klucz = ciężar. */
  repsAt: Map<number, number>
  /** Najdłuższa seria na czas (s) i najdłuższy dystans (m). */
  maxDuration: number
  maxDistance: number
}

/** Dolicza zaliczoną serię roboczą do rekordów. */
function addToBests(b: Bests, s: WorkoutSet) {
  if (s.weightKg > b.maxWeight || (s.weightKg === b.maxWeight && s.reps > b.maxWeightReps)) {
    b.maxWeight = s.weightKg
    b.maxWeightReps = s.reps
  }
  if (s.reps > 0) {
    b.bestE1rm = Math.max(b.bestE1rm, e1rm(s.weightKg, s.reps))
    b.repsAt.set(s.weightKg, Math.max(b.repsAt.get(s.weightKg) ?? 0, s.reps))
  }
  b.maxDuration = Math.max(b.maxDuration, s.durationSec ?? 0)
  b.maxDistance = Math.max(b.maxDistance, s.distanceM ?? 0)
}

/** Rekordy ćwiczenia z zakończonych treningów (bez rozgrzewek). */
export async function exerciseBests(exerciseId: number, excludeWorkoutId?: number, before?: number): Promise<Bests> {
  const { sets, workouts } = await finishedWorkoutsWith(exerciseId, excludeWorkoutId)
  // Przy starszych treningach liczą się tylko wcześniejsze — rekord to rekord „na tamten dzień”.
  const valid = new Set(workouts.filter((w) => before === undefined || w.startedAt < before).map((w) => w.id))
  const b: Bests = { maxWeight: 0, maxWeightReps: 0, bestE1rm: 0, repsAt: new Map(), maxDuration: 0, maxDistance: 0 }
  for (const s of sets) {
    if (!valid.has(s.workoutId) || !s.done || s.type === 'rozgrzewka') continue
    addToBests(b, s)
  }
  return b
}

/** Czy seria bije dotychczasowe rekordy? Zwraca opis rekordu albo null. */
export function prFor(
  s: Pick<WorkoutSet, 'weightKg' | 'reps' | 'type' | 'done' | 'durationSec' | 'distanceM'>,
  b: Bests | undefined,
): string | null {
  if (!b || !s.done || s.type === 'rozgrzewka') return null
  // Seria na dystans (bieżnia, spacer farmera) albo na czas (deska) — rekord dystansu / czasu.
  if (s.distanceM) {
    if (s.weightKg > 0 && b.maxWeight > 0 && s.weightKg > b.maxWeight) return 'Rekord ciężaru'
    if (b.maxDistance > 0 && s.distanceM > b.maxDistance) return 'Rekord dystansu'
    return null
  }
  if (s.durationSec && s.reps <= 0) return b.maxDuration > 0 && s.durationSec > b.maxDuration ? 'Rekord czasu' : null
  if (s.reps <= 0) return null
  const hasHistory = b.bestE1rm > 0 || b.repsAt.size > 0
  if (!hasHistory) return null
  if (s.weightKg > b.maxWeight) return 'Rekord ciężaru'
  if (s.weightKg > 0 && e1rm(s.weightKg, s.reps) > b.bestE1rm + 0.01) return 'Rekord 1RM'
  const prev = b.repsAt.get(s.weightKg)
  if (prev !== undefined && s.reps > prev) return 'Rekord powtórzeń'
  return null
}

export interface SessionPoint {
  workoutId: number
  date: number
  e1rm: number
  maxWeight: number
  volume: number
  /** Najdłuższa seria (s), łączny czas (s) i łączny dystans (m) z treningu. */
  maxDuration: number
  totalDuration: number
  totalDistance: number
  /** Średnia prędkość km/h (cardio z dystansem i czasem), 0 gdy brak. */
  speed: number
  sets: WorkoutSet[]
}

/** Średnia prędkość (km/h) z serii, które mają i dystans, i czas. */
function speedOf(sets: WorkoutSet[]) {
  const both = sets.filter((s) => s.distanceM && s.durationSec)
  const m = both.reduce((a, s) => a + s.distanceM!, 0)
  const sec = both.reduce((a, s) => a + s.durationSec!, 0)
  return sec > 0 ? Math.round((m / 1000 / (sec / 3600)) * 10) / 10 : 0
}

/** Historia ćwiczenia: jeden punkt na trening, od najstarszego. */
export async function exerciseHistory(exerciseId: number): Promise<SessionPoint[]> {
  const { sets, workouts } = await finishedWorkoutsWith(exerciseId)
  return workouts
    .map((w) => {
      const ws = sets.filter((s) => s.workoutId === w.id).sort((a, b) => a.order - b.order)
      const work = ws.filter((s) => s.done && s.type !== 'rozgrzewka')
      return {
        workoutId: w.id,
        date: w.startedAt,
        e1rm: Math.max(0, ...work.map((s) => e1rm(s.weightKg, s.reps))),
        maxWeight: Math.max(0, ...work.map((s) => s.weightKg)),
        volume: volume(ws),
        maxDuration: Math.max(0, ...work.map((s) => s.durationSec ?? 0)),
        totalDuration: work.reduce((a, s) => a + (s.durationSec ?? 0), 0),
        totalDistance: work.reduce((a, s) => a + (s.distanceM ?? 0), 0),
        speed: speedOf(work),
        sets: ws,
      }
    })
    .filter((p) => p.sets.some((s) => s.done))
    .reverse()
}

/** Rekordy liczone na żywo: każda seria porównywana z historią i wcześniejszymi seriami z tego treningu. */
export function livePRs(sets: WorkoutSet[], bests: Bests | undefined) {
  const out = new Map<number, string>()
  if (!bests) return out
  const run: Bests = { ...bests, repsAt: new Map(bests.repsAt) }
  for (const s of sets) {
    const pr = prFor(s, run)
    if (pr) out.set(s.id, pr)
    if (s.done && s.type !== 'rozgrzewka') addToBests(run, s)
  }
  return out
}

/** Wszystkie rekordy pobite w danym treningu: [{exerciseId, setId, opis}]. */
export async function workoutPRs(workoutId: number) {
  const w = await db.workouts.get(workoutId)
  const sets = (await db.sets.where('workoutId').equals(workoutId).toArray()).sort((a, b) => a.order - b.order)
  const out: { exerciseId: number; set: WorkoutSet; label: string }[] = []
  for (const exId of new Set(sets.map((s) => s.exerciseId))) {
    const own = sets.filter((s) => s.exerciseId === exId)
    const prs = livePRs(own, await exerciseBests(exId, workoutId, w?.startedAt))
    // Na ćwiczenie pokazujemy najlepszą serię z rekordem (ostatnią, czyli najmocniejszą w kolejności bicia).
    const hits = own.filter((s) => prs.has(s.id))
    const top = hits[hits.length - 1]
    if (top) out.push({ exerciseId: exId, set: top, label: prs.get(top.id)! })
  }
  return out
}
