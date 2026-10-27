import { describe, expect, it } from 'vitest'
import type { Workout, WorkoutSet } from '../db'
import { pickCurrent, setText } from './lockscreenModel'

const set = (id: number, exerciseId: number, order: number, done: boolean, extra: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id, workoutId: 1, exerciseId, order, type: 'robocza', weightKg: 80, reps: 8, done, ...extra,
})
const workout = { id: 1, name: 'Upper A', startedAt: 0, status: 'trwa', items: [{ exerciseId: 10, restSec: 120 }, { exerciseId: 20, restSec: 90 }] } as Workout

describe('ekran blokady', () => {
  const sets = [set(1, 10, 0, false, { type: 'rozgrzewka', weightKg: 40, reps: 10 }), set(2, 10, 1, false), set(3, 10, 2, false), set(4, 20, 0, false)]

  it('bierze pierwszą niezaliczoną serię, a ćwiczenie z ekranu ma pierwszeństwo', () => {
    expect(pickCurrent(workout, sets).set?.id).toBe(1)
    expect(pickCurrent(workout, sets, 20).set?.id).toBe(4)
    const done10 = sets.map((s) => (s.exerciseId === 10 ? { ...s, done: true } : s))
    expect(pickCurrent(workout, done10, 10).set?.id).toBe(4)
    expect(pickCurrent(workout, sets.map((s) => ({ ...s, done: true }))).set).toBeUndefined()
  })

  it('po ostatniej serii całego treningu nie ma już przerwy', () => {
    const onlyLast = sets.map((s) => (s.id === 4 ? s : { ...s, done: true }))
    expect(pickCurrent(workout, onlyLast).moreAfter).toBe(false)
    expect(pickCurrent(workout, sets).moreAfter).toBe(true)
  })

  it('opisuje serię po polsku', () => {
    expect(setText(sets[0], sets)).toBe('Rozgrzewka · 40 kg × 10')
    expect(setText(sets[2], sets)).toBe('Seria 2 z 2 · 80 kg × 8')
    expect(setText(set(9, 30, 0, false, { weightKg: 0, reps: 12 }), [])).toBe('Seria 0 z 0 · masa ciała × 12')
    expect(setText(set(9, 30, 0, false, { weightKg: 0, durationSec: 60 }), [set(9, 30, 0, false)])).toBe('Seria 1 z 1 · 60 s')
  })
})
