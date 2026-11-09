import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, ensureSeed, type Workout, type WorkoutSet } from '../db'
import { exerciseHistory, lastExerciseComment } from './stats'

let exA = 0

async function addWorkout(startedAt: number, note?: string, status: Workout['status'] = 'zakończony') {
  const id = await db.workouts.add({
    name: 'Góra',
    startedAt,
    endedAt: startedAt + 1000,
    status,
    items: [{ exerciseId: exA, restSec: 90, ...(note ? { note } : {}) }],
  } as Workout)
  await db.sets.add({ workoutId: id, exerciseId: exA, order: 0, type: 'robocza', weightKg: 60, reps: 8, done: true } as WorkoutSet)
  return id
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  await ensureSeed()
  exA = (await db.exercises.limit(1).toArray())[0].id
})

describe('komentarz do ćwiczenia', () => {
  it('pokazuje komentarz z ostatniego treningu z tym ćwiczeniem', async () => {
    await addWorkout(1000, 'stary')
    await addWorkout(2000, 'następnym razem 62,5 kg')
    const running = await addWorkout(3000, undefined, 'trwa')
    expect(await lastExerciseComment(exA, running)).toEqual({ note: 'następnym razem 62,5 kg', date: 2000 })
  })

  it('nie pokazuje starego komentarza, gdy ostatnio go nie było', async () => {
    await addWorkout(1000, 'stary')
    await addWorkout(2000)
    expect(await lastExerciseComment(exA)).toBeUndefined()
  })

  it('komentarz jest w historii ćwiczenia', async () => {
    await addWorkout(1000, 'bolał bark')
    expect((await exerciseHistory(exA))[0].note).toBe('bolał bark')
  })
})
