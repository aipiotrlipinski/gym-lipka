import type { Measure, Workout, WorkoutSet } from '../db'
import { kg, setLabelAs } from './format'
import { afterSet } from './superset'

/** Czysta logika powiadomienia na ekranie blokady (bez przeglądarki — testowalna). */

/** Bieżąca seria: pierwsza niezaliczona w ćwiczeniu z ekranu, a gdy go brak — w pierwszym niedokończonym. */
export function pickCurrent(workout: Workout, sets: WorkoutSet[], focus?: number) {
  const undone = (eid: number) => sets.filter((s) => s.exerciseId === eid && !s.done).sort((a, b) => a.order - b.order)
  const items = workout.items.filter((it) => undone(it.exerciseId).length > 0)
  const item = items.find((it) => it.exerciseId === focus) ?? items[0]
  if (!item) return { item: undefined, set: undefined, moreAfter: false }
  const left = undone(item.exerciseId)
  return { item, set: left[0], moreAfter: left.length > 1 || items.length > 1 }
}

/**
 * Po „Seria zrobiona” z ekranu blokady: czy włączyć przerwę i które ćwiczenie pokazać dalej.
 * W superserii przerwa jest dopiero po całej rundzie.
 */
export function afterLockDone(workout: Workout, sets: WorkoutSet[], doneSetId: number) {
  const updated = sets.map((s) => (s.id === doneSetId ? { ...s, done: true } : s))
  const set = sets.find((s) => s.id === doneSetId)
  const i = workout.items.findIndex((it) => it.exerciseId === set?.exerciseId)
  if (i < 0) return { rest: false, nextExerciseId: undefined }
  const r = afterSet(workout.items, updated, i)
  return { rest: r.rest, nextExerciseId: r.goTo !== null ? workout.items[r.goTo].exerciseId : workout.items[i].exerciseId }
}

/** Tekst serii: „Seria 2 z 4 · 80 kg × 8”, „Rozgrzewka · 40 kg × 10”, „Seria 1 z 3 · 60 s”. */
export function setText(set: WorkoutSet, all: WorkoutSet[], measure?: Measure) {
  const load = measure
    ? setLabelAs(measure, set, true)
    : set.durationSec
    ? set.weightKg > 0
      ? `${kg(set.weightKg)} kg × ${set.durationSec} s`
      : `${set.durationSec} s`
    : `${set.weightKg > 0 ? `${kg(set.weightKg)} kg` : 'masa ciała'} × ${set.reps}`
  if (set.type === 'rozgrzewka') return `Rozgrzewka · ${load}`
  const work = all.filter((s) => s.exerciseId === set.exerciseId && s.type !== 'rozgrzewka').sort((a, b) => a.order - b.order)
  return `Seria ${work.findIndex((s) => s.id === set.id) + 1} z ${work.length} · ${load}`
}
