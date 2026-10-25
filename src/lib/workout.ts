import { db, type PlanDay, type SetType, type Workout, type WorkoutItem, type WorkoutSet } from '../db'
import { lastSessionSets } from './stats'

export async function activePlan() {
  return (await db.plans.toArray()).find((p) => p.active)
}

export async function planDaysOf(planId: number) {
  return (await db.planDays.where('planId').equals(planId).toArray()).sort((a, b) => a.order - b.order)
}

/** Następny dzień z rotacji aktywnego planu: ten po ostatnio wykonanym. */
export async function nextPlanDay(): Promise<PlanDay | undefined> {
  const plan = await activePlan()
  if (!plan) return undefined
  const days = await planDaysOf(plan.id)
  if (days.length === 0) return undefined
  const ids = new Set(days.map((d) => d.id))
  const done = (await db.workouts.orderBy('startedAt').reverse().toArray()).find(
    (w) => w.status === 'zakończony' && w.planDayId !== undefined && ids.has(w.planDayId),
  )
  if (!done) return days[0]
  const idx = days.findIndex((d) => d.id === done.planDayId)
  return days[(idx + 1) % days.length]
}

export async function activeWorkout(): Promise<Workout | undefined> {
  return db.workouts.where('status').equals('trwa').first()
}

/** Serie startowe dla ćwiczenia: rozgrzewki i ciężary z ostatniego razu, liczba serii roboczych z planu. */
async function initialSets(workoutId: number, exerciseId: number, workingSets: number, repsMin: number) {
  const last = await lastSessionSets(exerciseId, workoutId)
  const warm = last.filter((s) => s.type === 'rozgrzewka')
  const work = last.filter((s) => s.type !== 'rozgrzewka')
  const rows: Omit<WorkoutSet, 'id'>[] = []
  for (const w of warm) rows.push({ workoutId, exerciseId, order: rows.length, type: 'rozgrzewka', weightKg: w.weightKg, reps: w.reps, done: false })
  for (let i = 0; i < workingSets; i++) {
    const src = work[i] ?? work[work.length - 1]
    rows.push({
      workoutId,
      exerciseId,
      order: rows.length,
      type: src?.type === 'drop' ? 'drop' : 'robocza',
      weightKg: src?.weightKg ?? 0,
      reps: src?.reps ?? repsMin,
      done: false,
    })
  }
  return rows
}

/** Rozpoczyna trening: z dnia planu albo pusty. Zwraca id treningu. */
export async function startWorkout(planDayId?: number): Promise<number> {
  const running = await activeWorkout()
  if (running) return running.id
  const day = planDayId !== undefined ? await db.planDays.get(planDayId) : undefined
  const items: WorkoutItem[] = (day?.exercises ?? []).map((e) => ({
    exerciseId: e.exerciseId,
    restSec: e.restSec,
    repsMin: e.repsMin,
    repsMax: e.repsMax,
  }))
  return db.transaction('rw', db.workouts, db.sets, async () => {
    const id = await db.workouts.add({
      name: day?.name ?? 'Pusty trening',
      planDayId: day?.id,
      startedAt: Date.now(),
      status: 'trwa',
      items,
    } as Workout)
    for (const e of day?.exercises ?? []) {
      await db.sets.bulkAdd((await initialSets(id, e.exerciseId, e.sets, e.repsMin)) as WorkoutSet[])
    }
    return id
  })
}

export async function setsOf(workoutId: number) {
  return (await db.sets.where('workoutId').equals(workoutId).toArray()).sort((a, b) => a.order - b.order)
}

export async function addExercise(workoutId: number, exerciseId: number) {
  const w = await db.workouts.get(workoutId)
  if (!w) return
  if (w.items.some((i) => i.exerciseId === exerciseId)) return
  await db.workouts.update(workoutId, { items: [...w.items, { exerciseId, restSec: 90 }] })
  await db.sets.bulkAdd((await initialSets(workoutId, exerciseId, 3, 8)) as WorkoutSet[])
}

export async function removeExercise(workoutId: number, exerciseId: number) {
  const w = await db.workouts.get(workoutId)
  if (!w) return
  await db.workouts.update(workoutId, { items: w.items.filter((i) => i.exerciseId !== exerciseId) })
  const ids = (await setsOf(workoutId)).filter((s) => s.exerciseId === exerciseId).map((s) => s.id)
  await db.sets.bulkDelete(ids)
}

/** Zamienia ćwiczenie: tylko w tym treningu albo także w planie (na stałe). */
export async function swapExercise(workoutId: number, fromId: number, toId: number, permanent: boolean) {
  const w = await db.workouts.get(workoutId)
  if (!w || fromId === toId || w.items.some((i) => i.exerciseId === toId)) return
  const old = (await setsOf(workoutId)).filter((s) => s.exerciseId === fromId)
  const done = old.filter((s) => s.done)
  const undone = old.filter((s) => !s.done)
  const item = w.items.find((i) => i.exerciseId === fromId)
  const workingCount = Math.max(1, undone.filter((s) => s.type !== 'rozgrzewka').length)
  await db.transaction('rw', db.workouts, db.sets, db.planDays, async () => {
    await db.workouts.update(workoutId, {
      items: w.items.map((i) => (i.exerciseId === fromId ? { ...i, exerciseId: toId } : i)),
    })
    // Zaliczone serie zostają przy starym ćwiczeniu tylko jeśli były; najczęściej zamiana jest przed startem.
    await db.sets.bulkDelete(undone.map((s) => s.id))
    for (const s of done) await db.sets.update(s.id, { exerciseId: toId })
    const fresh = await initialSets(workoutId, toId, workingCount, item?.repsMin ?? 8)
    await db.sets.bulkAdd(fresh.map((s, i) => ({ ...s, order: done.length + i })) as WorkoutSet[])
    if (permanent && w.planDayId !== undefined) {
      const day = await db.planDays.get(w.planDayId)
      if (day) {
        await db.planDays.update(day.id, {
          exercises: day.exercises.map((e) => (e.exerciseId === fromId ? { ...e, exerciseId: toId } : e)),
        })
      }
    }
  })
}

export async function addSet(workoutId: number, exerciseId: number) {
  const sets = (await setsOf(workoutId)).filter((s) => s.exerciseId === exerciseId)
  const last = sets[sets.length - 1]
  await db.sets.add({
    workoutId,
    exerciseId,
    order: (last?.order ?? -1) + 1,
    type: last?.type === 'rozgrzewka' ? 'robocza' : (last?.type ?? 'robocza'),
    weightKg: last?.weightKg ?? 0,
    reps: last?.reps ?? 8,
    done: false,
  } as WorkoutSet)
}

const NEXT_TYPE: Record<SetType, SetType> = { robocza: 'rozgrzewka', rozgrzewka: 'drop', drop: 'robocza' }
export function cycleType(t: SetType): SetType {
  return NEXT_TYPE[t]
}

/** Kończy trening: niewykonane serie są usuwane, puste ćwiczenia znikają z listy. */
export async function finishWorkout(workoutId: number) {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    const sets = await setsOf(workoutId)
    await db.sets.bulkDelete(sets.filter((s) => !s.done).map((s) => s.id))
    const left = new Set(sets.filter((s) => s.done).map((s) => s.exerciseId))
    const w = await db.workouts.get(workoutId)
    await db.workouts.update(workoutId, {
      status: 'zakończony',
      endedAt: w?.endedAt ?? Date.now(),
      items: (w?.items ?? []).filter((i) => left.has(i.exerciseId)),
    })
  })
}

export async function deleteWorkout(workoutId: number) {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    await db.sets.where('workoutId').equals(workoutId).delete()
    await db.workouts.delete(workoutId)
  })
}
