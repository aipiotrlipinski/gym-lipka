import { db, type PlanDay, type SetType, type Workout, type WorkoutItem, type WorkoutSet } from '../db'
import { lastSessionSets } from './stats'
import { removeAt } from './superset'
import { defaultsFor, fieldsOf, measureOf } from './measure'

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

/** Pola wartości serii skopiowane z poprzedniej (albo domyślne dla sposobu zapisu). */
function valuesFrom(src: WorkoutSet | undefined, m: ReturnType<typeof measureOf>, repsMin: number) {
  const f = fieldsOf(m)
  const d = defaultsFor(m)
  const out: Pick<WorkoutSet, 'weightKg' | 'reps'> & Partial<Pick<WorkoutSet, 'durationSec' | 'distanceM'>> = {
    weightKg: f.weight ? (src?.weightKg ?? d.weightKg) : 0,
    reps: f.reps ? src?.reps || repsMin : 0,
  }
  if (f.duration) out.durationSec = src?.durationSec || d.durationSec
  if (f.distance) out.distanceM = src?.distanceM ?? d.distanceM
  return out
}

/**
 * Serie startowe dla ćwiczenia: rozgrzewki i ciężary z ostatniego razu, liczba serii roboczych z planu.
 * Gdy plan ma wpisane obciążenie, serie robocze startują z niego.
 */
type PlanTargets = { weightKg?: number; durationSec?: number; distanceM?: number }

async function initialSets(workoutId: number, exerciseId: number, workingSets: number, repsMin: number, plan: PlanTargets = {}) {
  const last = await lastSessionSets(exerciseId, workoutId)
  const m = measureOf(await db.exercises.get(exerciseId))
  const f = fieldsOf(m)
  const warm = last.filter((s) => s.type === 'rozgrzewka')
  const work = last.filter((s) => s.type !== 'rozgrzewka')
  const rows: Omit<WorkoutSet, 'id'>[] = []
  for (const w of warm) rows.push({ workoutId, exerciseId, order: rows.length, type: 'rozgrzewka', ...valuesFrom(w, m, repsMin), done: false })
  for (let i = 0; i < workingSets; i++) {
    const src = work[i] ?? work[work.length - 1]
    rows.push({
      workoutId,
      exerciseId,
      order: rows.length,
      type: src?.type === 'drop' ? 'drop' : 'robocza',
      // Ciężar, powtórzenia, czas i dystans z ostatniego razu — tylko pola pasujące do sposobu zapisu.
      ...valuesFrom(src, m, repsMin),
      // Obciążenie, czas i dystans wpisane w planie mają pierwszeństwo (tylko pola pasujące do sposobu zapisu).
      ...(plan.weightKg !== undefined && f.weight ? { weightKg: plan.weightKg } : {}),
      ...(plan.durationSec && f.duration ? { durationSec: plan.durationSec } : {}),
      ...(plan.distanceM !== undefined && f.distance ? { distanceM: plan.distanceM } : {}),
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
    ...(e.superset ? { superset: true } : {}),
  }))
  return db.transaction('rw', db.workouts, db.sets, db.exercises, async () => {
    const id = await db.workouts.add({
      name: day?.name ?? 'Pusty trening',
      planDayId: day?.id,
      startedAt: Date.now(),
      status: 'trwa',
      items,
    } as Workout)
    for (const e of day?.exercises ?? []) {
      await db.sets.bulkAdd((await initialSets(id, e.exerciseId, e.sets, e.repsMin, e)) as WorkoutSet[])
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
  await db.workouts.update(workoutId, { items: removeAt(w.items, (i) => i.exerciseId === exerciseId) })
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
  await db.transaction('rw', db.workouts, db.sets, db.planDays, db.exercises, async () => {
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
  const m = measureOf(await db.exercises.get(exerciseId))
  await db.sets.add({
    workoutId,
    exerciseId,
    order: (last?.order ?? -1) + 1,
    type: last?.type === 'rozgrzewka' ? 'robocza' : (last?.type ?? 'robocza'),
    ...valuesFrom(last, m, 8),
    done: false,
  } as WorkoutSet)
}

const NEXT_TYPE: Record<SetType, SetType> = { robocza: 'rozgrzewka', rozgrzewka: 'drop', drop: 'robocza' }
export function cycleType(t: SetType): SetType {
  return NEXT_TYPE[t]
}

/** Kończy trening: niewykonane serie są usuwane, puste ćwiczenia znikają z listy. Obciążenia w planie dostają ciężary z tego treningu. */
export async function finishWorkout(workoutId: number) {
  await db.transaction('rw', db.workouts, db.sets, db.planDays, db.exercises, async () => {
    const sets = await setsOf(workoutId)
    await db.sets.bulkDelete(sets.filter((s) => !s.done).map((s) => s.id))
    const left = new Set(sets.filter((s) => s.done).map((s) => s.exerciseId))
    const w = await db.workouts.get(workoutId)
    await db.workouts.update(workoutId, {
      status: 'zakończony',
      endedAt: w?.endedAt ?? Date.now(),
      items: removeAt(w?.items ?? [], (i) => !left.has(i.exerciseId)),
    })
    const day = w?.planDayId !== undefined ? await db.planDays.get(w.planDayId) : undefined
    if (day) {
      // Najlepsza seria robocza każdego ćwiczenia: ciężar, czas i dystans — tylko pola pasujące do sposobu zapisu.
      const top = new Map<number, PlanTargets>()
      const fields = new Map<number, ReturnType<typeof fieldsOf>>()
      for (const s of sets) {
        if (!s.done || s.type === 'rozgrzewka') continue
        if (!fields.has(s.exerciseId)) fields.set(s.exerciseId, fieldsOf(measureOf(await db.exercises.get(s.exerciseId))))
        const f = fields.get(s.exerciseId)!
        const t = top.get(s.exerciseId) ?? {}
        if (f.weight) t.weightKg = Math.max(t.weightKg ?? 0, s.weightKg)
        if (f.duration && s.durationSec) t.durationSec = Math.max(t.durationSec ?? 0, s.durationSec)
        if (f.distance && s.distanceM) t.distanceM = Math.max(t.distanceM ?? 0, s.distanceM)
        top.set(s.exerciseId, t)
      }
      const next = day.exercises.map((e) => (top.has(e.exerciseId) ? { ...e, ...top.get(e.exerciseId) } : e))
      if (JSON.stringify(next) !== JSON.stringify(day.exercises)) await db.planDays.update(day.id, { exercises: next })
    }
  })
}

export async function deleteWorkout(workoutId: number) {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    await db.sets.where('workoutId').equals(workoutId).delete()
    await db.workouts.delete(workoutId)
  })
}

/** Łączy ćwiczenie z następnym w superserię albo je rozłącza (tylko w tym treningu). */
export async function toggleSuperset(workoutId: number, exerciseId: number) {
  const w = await db.workouts.get(workoutId)
  if (!w) return
  await db.workouts.update(workoutId, {
    items: w.items.map((i) => (i.exerciseId === exerciseId ? { ...i, superset: i.superset ? undefined : true } : i)),
  })
}
