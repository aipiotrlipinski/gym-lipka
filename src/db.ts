import Dexie, { type EntityTable } from 'dexie'

/** Baza danych w telefonie (IndexedDB). Model zgodny ze specyfikacją MVP. */

export type MuscleGroup = 'klatka' | 'plecy' | 'nogi' | 'barki' | 'ramiona' | 'brzuch' | 'inne'
export type Equipment = 'sztanga' | 'hantle' | 'maszyna' | 'wyciąg' | 'masa ciała' | 'inne'
export type SetType = 'rozgrzewka' | 'robocza' | 'drop'

export interface Exercise {
  id: number
  name: string
  muscle: MuscleGroup
  equipment: Equipment
  custom: boolean
  note?: string
}

export interface Plan {
  id: number
  name: string
  active: boolean
  createdAt: number
}

export interface PlanExercise {
  exerciseId: number
  sets: number
  repsMin: number
  repsMax: number
  restSec: number
}

export interface PlanDay {
  id: number
  planId: number
  name: string
  order: number
  exercises: PlanExercise[]
}

/** Ćwiczenie w konkretnym treningu: kolejność, przerwa i notatka. Serie są w tabeli `sets`. */
export interface WorkoutItem {
  exerciseId: number
  restSec: number
  repsMin?: number
  repsMax?: number
  note?: string
}

export interface Workout {
  id: number
  planDayId?: number
  name: string
  startedAt: number
  endedAt?: number
  status: 'trwa' | 'zakończony'
  note?: string
  /** Skąd pochodzi trening, gdy nie był zapisany w aplikacji (np. import z GymRun). */
  source?: 'gymrun'
  items: WorkoutItem[]
}

export interface WorkoutSet {
  id: number
  workoutId: number
  exerciseId: number
  order: number
  type: SetType
  weightKg: number
  reps: number
  /** Seria na czas (np. deska) — liczba sekund zamiast powtórzeń. */
  durationSec?: number
  done: boolean
}

export interface BodyMeasurement {
  id: number
  date: number
  weightKg: number
}

export const db = new Dexie('gym-lipka') as Dexie & {
  exercises: EntityTable<Exercise, 'id'>
  plans: EntityTable<Plan, 'id'>
  planDays: EntityTable<PlanDay, 'id'>
  workouts: EntityTable<Workout, 'id'>
  sets: EntityTable<WorkoutSet, 'id'>
  body: EntityTable<BodyMeasurement, 'id'>
}

db.version(1).stores({
  exercises: '++id, name, muscle',
  plans: '++id, active',
  planDays: '++id, planId, order',
  workouts: '++id, startedAt, status, planDayId',
  sets: '++id, workoutId, exerciseId, [exerciseId+workoutId]',
  body: '++id, date',
})

/**
 * Przy pierwszym uruchomieniu wgrywa bazę ćwiczeń i plan startowy.
 * Bezpieczne do wielokrotnego wywołania — działa tylko, gdy baza ćwiczeń jest pusta.
 */
export async function ensureSeed() {
  const { BUILTIN_EXERCISES, STARTER_PLAN } = await import('./data/exercises')
  await db.transaction('rw', db.exercises, db.plans, db.planDays, async () => {
    if ((await db.exercises.count()) > 0) return
    await db.exercises.bulkAdd(
      BUILTIN_EXERCISES.map(([name, muscle, equipment]) => ({ name, muscle, equipment, custom: false }) as Exercise),
    )
    if ((await db.plans.count()) > 0) return
    const all = await db.exercises.toArray()
    const byName = new Map(all.map((e) => [e.name, e.id]))
    const planId = await db.plans.add({ name: STARTER_PLAN.name, active: true, createdAt: Date.now() } as Plan)
    for (const [i, day] of STARTER_PLAN.days.entries()) {
      await db.planDays.add({
        planId,
        name: day.name,
        order: i,
        exercises: day.exercises
          .filter(([n]) => byName.has(n))
          .map(([n, sets, repsMin, repsMax, restSec]) => ({ exerciseId: byName.get(n)!, sets, repsMin, repsMax, restSec })),
      } as PlanDay)
    }
  })
}

/**
 * Prosi przeglądarkę o trwały zapis, żeby Android nie wyczyścił danych
 * przy braku miejsca. Zwraca true, gdy dane są chronione.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}
