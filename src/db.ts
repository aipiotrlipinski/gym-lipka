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

export interface Workout {
  id: number
  planDayId?: number
  name: string
  startedAt: number
  endedAt?: number
  status: 'trwa' | 'zakończony'
  note?: string
}

export interface WorkoutSet {
  id: number
  workoutId: number
  exerciseId: number
  order: number
  type: SetType
  weightKg: number
  reps: number
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
 * Prosi przeglądarkę o trwały zapis, żeby Android nie wyczyścił danych
 * przy braku miejsca. Zwraca true, gdy dane są chronione.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}
