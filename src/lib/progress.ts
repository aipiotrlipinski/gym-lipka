import type { Exercise, WorkoutItem, WorkoutSet } from '../db'
import { kg } from './format'
import { measureOf } from './measure'

/**
 * Asystent progresji — metoda „podwójnej progresji”:
 * 1) dokładasz powtórzenia przy tym samym ciężarze, aż wszystkie serie dojdą do górnej granicy zakresu,
 * 2) wtedy dokładasz ciężar i wracasz do dolnej granicy zakresu.
 */
export interface Suggestion {
  weightKg: number
  reps: number
  kind: 'ciężar' | 'powtórzenia'
  title: string
  reason: string
}

/** O ile zwiększać ciężar dla danego sprzętu. */
export function weightStep(e?: Exercise) {
  switch (e?.equipment) {
    case 'hantle':
      return 2
    case 'masa ciała':
      return 2.5
    default:
      return 2.5
  }
}

export function suggest(e: Exercise | undefined, item: WorkoutItem | undefined, last: WorkoutSet[]): Suggestion | null {
  // Podwójna progresja ma sens tylko przy ciężarze × powtórzeniach (nie przy desce czy bieżni).
  if (measureOf(e) !== 'ciężar') return null
  const work = last.filter((s) => s.done && s.type === 'robocza' && s.reps > 0)
  if (work.length === 0) return null
  const repsMin = item?.repsMin ?? 8
  const repsMax = item?.repsMax ?? 12
  const top = Math.max(...work.map((s) => s.weightKg))
  const atTop = work.filter((s) => s.weightKg === top)
  const minReps = Math.min(...atTop.map((s) => s.reps))
  const bodyweight = e?.equipment === 'masa ciała' && top === 0

  if (minReps >= repsMax && !bodyweight) {
    const w = top + weightStep(e)
    return {
      weightKg: w,
      reps: repsMin,
      kind: 'ciężar',
      title: `Dołóż ciężaru: ${kg(w)} kg × ${repsMin}`,
      reason: `Ostatnio wszystkie serie z ${kg(top)} kg doszły do ${repsMax} powt. — czas na więcej.`,
    }
  }
  const target = Math.min(repsMax, minReps + 1)
  if (bodyweight && minReps >= repsMax) {
    return {
      weightKg: 0,
      reps: minReps + 1,
      kind: 'powtórzenia',
      title: `Celuj w ${minReps + 1} powt. w każdej serii`,
      reason: `Ostatnio min. ${minReps} powt. Możesz też dodać obciążenie (pas, hantel między nogi).`,
    }
  }
  return {
    weightKg: top,
    reps: target,
    kind: 'powtórzenia',
    title: `Zostań przy ${top === 0 ? 'masie ciała' : `${kg(top)} kg`} i celuj w ${target} powt.`,
    reason: `Ostatnio najsłabsza seria: ${minReps} powt. Gdy wszystkie serie dojdą do ${repsMax}, podpowiem dołożenie ciężaru.`,
  }
}
