import Dexie, { type EntityTable } from 'dexie'
import type { MetricKey } from './lib/body'

/** Baza danych w telefonie (IndexedDB). Model zgodny ze specyfikacją MVP. */

export type MuscleGroup = 'klatka' | 'plecy' | 'nogi' | 'barki' | 'ramiona' | 'brzuch' | 'inne'
export type Equipment = 'sztanga' | 'hantle' | 'maszyna' | 'wyciąg' | 'masa ciała' | 'inne'
export type SetType = 'rozgrzewka' | 'robocza' | 'drop'
/** Sposób zapisu serii — szczegóły w `lib/measure.ts`. */
export type Measure = 'ciężar' | 'czas' | 'cardio' | 'ciężar-dystans'

export interface Exercise {
  id: number
  name: string
  muscle: MuscleGroup
  equipment: Equipment
  custom: boolean
  /** Stała notatka — widoczna w każdym treningu z tym ćwiczeniem. */
  note?: string
  /** Zdjęcie z biblioteki (slug) — dla własnych ćwiczeń; wbudowane mają zdjęcie po nazwie. */
  image?: string
  /** Jak zapisywać serie (ciężar × powt., czas, dystans…). Brak = zgadnięte po nazwie. */
  measure?: Measure
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
  /** Obciążenie serii roboczych w kg; brak = ciężar z ostatniego treningu. Aktualizuje się po treningu. */
  weightKg?: number
  /** Superseria: to ćwiczenie jest połączone z następnym (bez przerwy między nimi). */
  superset?: boolean
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
  /** Notatka tylko do tego treningu (stała notatka jest w `Exercise.note`). */
  note?: string
  /** Superseria: to ćwiczenie jest połączone z następnym (bez przerwy między nimi). */
  superset?: boolean
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
  /** Seria na dystans (bieżnia, spacer farmera) — w metrach. */
  distanceM?: number
  done: boolean
}

/** Pomiar ciała: waga, skład ciała i obwody — każde pole opcjonalne (zapisujemy tylko to, co zmierzone). Lista miar: lib/body.ts. */
export interface BodyMeasurement extends Partial<Record<MetricKey, number>> {
  id: number
  date: number
}

export const db = new Dexie('silka') as Dexie & {
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
 * Przy pierwszym uruchomieniu wgrywa bazę ćwiczeń. Bez planów — zaczynasz od zera.
 * Bezpieczne do wielokrotnego wywołania — działa tylko, gdy baza ćwiczeń jest pusta.
 */
export async function ensureSeed() {
  const { BUILTIN_EXERCISES } = await import('./data/exercises')
  await db.transaction('rw', db.exercises, async () => {
    if ((await db.exercises.count()) > 0) return
    await db.exercises.bulkAdd(
      BUILTIN_EXERCISES.map(([name, muscle, equipment]) => ({ name, muscle, equipment, custom: false }) as Exercise),
    )
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
