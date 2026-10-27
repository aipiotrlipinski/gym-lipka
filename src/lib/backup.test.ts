import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, ensureSeed, type BodyMeasurement, type Workout, type WorkoutSet } from '../db'
import { BackupError, exportBackup, parseBackup, restoreBackup, summarize } from './backup'
import { startWorkout, finishWorkout, setsOf } from './workout'

beforeEach(async () => {
  await db.delete()
  await db.open()
  await ensureSeed()
})

describe('kopia zapasowa', () => {
  it('eksport → import odtwarza bazę 1:1 (z tymi samymi id)', async () => {
    const day = (await db.planDays.toArray())[0]
    const wid = await startWorkout(day.id)
    for (const s of await setsOf(wid)) await db.sets.update(s.id, { done: true, weightKg: 50 })
    await finishWorkout(wid)
    await db.body.add({ date: 1, weightKg: 84.5 } as BodyMeasurement)

    const before = await exportBackup()
    const text = JSON.stringify(before)

    // Inny telefon: świeża baza z innymi danymi.
    await db.delete()
    await db.open()
    await ensureSeed()
    await db.workouts.add({ name: 'śmieć', startedAt: 5, status: 'trwa', items: [] } as unknown as Workout)

    const parsed = parseBackup(text)
    expect(summarize(parsed).workouts).toBe(1)
    await restoreBackup(parsed)

    const after = await exportBackup()
    expect(after.data).toEqual(before.data)
    const w = (await db.workouts.toArray()) as Workout[]
    expect(w).toHaveLength(1)
    const sets = (await db.sets.where('workoutId').equals(w[0].id).toArray()) as WorkoutSet[]
    expect(sets.every((s) => s.weightKg === 50)).toBe(true)
  })

  it('odrzuca obce i uszkodzone pliki', () => {
    expect(() => parseBackup('nie json')).toThrow(BackupError)
    expect(() => parseBackup('{"app":"inna"}')).toThrow(BackupError)
    expect(() => parseBackup(JSON.stringify({ app: 'gym-lipka', format: 2, data: {} }))).toThrow(/nowszej/)
    expect(() =>
      parseBackup(JSON.stringify({ app: 'gym-lipka', format: 1, data: { exercises: [{ id: 1 }], plans: [] } })),
    ).toThrow(/uszkodzony/)
  })
})
