import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, ensureSeed, type Plan, type PlanDay } from '../db'
import { finishWorkout, setsOf, startWorkout } from './workout'

let dayId = 0
let exA = 0
let exB = 0

beforeEach(async () => {
  await db.delete()
  await db.open()
  await ensureSeed()
  ;[exA, exB] = (await db.exercises.limit(2).toArray()).map((e) => e.id)
  const planId = await db.plans.add({ name: 'Test', active: true, createdAt: 1 } as Plan)
  dayId = await db.planDays.add({
    planId,
    name: 'Góra',
    order: 0,
    exercises: [
      { exerciseId: exA, sets: 3, repsMin: 8, repsMax: 10, restSec: 60, weightKg: 60 },
      { exerciseId: exB, sets: 2, repsMin: 8, repsMax: 10, restSec: 60 },
    ],
  } as PlanDay)
})

describe('obciążenie w planie', () => {
  it('trening startuje z ciężaru wpisanego w planie', async () => {
    const wid = await startWorkout(dayId)
    const sets = await setsOf(wid)
    expect(sets.filter((s) => s.exerciseId === exA).map((s) => s.weightKg)).toEqual([60, 60, 60])
    expect(sets.filter((s) => s.exerciseId === exB).map((s) => s.weightKg)).toEqual([0, 0])
  })

  it('po treningu plan dostaje najcięższy ciężar serii roboczych', async () => {
    const wid = await startWorkout(dayId)
    for (const s of await setsOf(wid)) {
      await db.sets.update(s.id, { done: true, weightKg: s.exerciseId === exA ? (s.order === 2 ? 62.5 : 60) : 20 })
    }
    await finishWorkout(wid)
    const day = await db.planDays.get(dayId)
    expect(day!.exercises.map((e) => e.weightKg)).toEqual([62.5, 20])
    // następny trening zaczyna od nowych ciężarów
    const next = await setsOf(await startWorkout(dayId))
    expect(next.filter((s) => s.exerciseId === exA).every((s) => s.weightKg === 62.5)).toBe(true)
  })

  it('czas i dystans z planu: start treningu i aktualizacja po treningu', async () => {
    const run = (await db.exercises.where('name').equals('Bieżnia').first())!.id
    const plank = (await db.exercises.where('name').equals('Deska (plank)').first())!.id
    const day = (await db.planDays.get(dayId))!
    await db.planDays.update(dayId, {
      exercises: [
        ...day.exercises,
        { exerciseId: run, sets: 1, repsMin: 8, repsMax: 12, restSec: 60, durationSec: 25 * 60, distanceM: 4000 },
        { exerciseId: plank, sets: 2, repsMin: 8, repsMax: 12, restSec: 60, durationSec: 45 },
      ],
    })
    const wid = await startWorkout(dayId)
    const sets = await setsOf(wid)
    expect(sets.filter((s) => s.exerciseId === run).map((s) => [s.durationSec, s.distanceM])).toEqual([[1500, 4000]])
    expect(sets.filter((s) => s.exerciseId === plank).map((s) => s.durationSec)).toEqual([45, 45])
    for (const s of sets) {
      const patch = s.exerciseId === run ? { durationSec: 1800, distanceM: 5000 } : s.exerciseId === plank ? { durationSec: s.order === 1 ? 60 : 45 } : {}
      await db.sets.update(s.id, { done: true, ...patch })
    }
    await finishWorkout(wid)
    const after = (await db.planDays.get(dayId))!.exercises
    const r = after.find((e) => e.exerciseId === run)!
    const p = after.find((e) => e.exerciseId === plank)!
    expect([r.durationSec, r.distanceM, r.weightKg]).toEqual([1800, 5000, undefined])
    expect([p.durationSec, p.weightKg]).toEqual([60, undefined])
  })
})
