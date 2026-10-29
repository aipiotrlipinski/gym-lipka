import { registerPlugin } from '@capacitor/core'
import { db } from '../db'
import { isApk } from './native'
import { STRENGTH_MET, weightAt } from './kcal'

/**
 * Health Connect (tam Google Fit zapisuje kroki). Działa tylko w APK —
 * w przeglądarce wszystkie funkcje zwracają „niedostępne”.
 */

export interface HealthStatus {
  status: 'available' | 'update_required' | 'unavailable' | 'web'
  steps: boolean
  writeWorkout: boolean
}

export interface DaySteps {
  date: string // RRRR-MM-DD
  steps: number
}

interface GymHealthPlugin {
  status(): Promise<HealthStatus>
  requestAccess(): Promise<HealthStatus>
  dailySteps(o: { days: number }): Promise<{ days: DaySteps[] }>
  saveWorkout(o: { id: string; title: string; start: number; end: number; activeKcal?: number; version: number }): Promise<{ saved: boolean }>
  openSettings(): Promise<void>
}

const GymHealth = registerPlugin<GymHealthPlugin>('GymHealth')
const WEB: HealthStatus = { status: 'web', steps: false, writeWorkout: false }

export async function healthStatus(): Promise<HealthStatus> {
  if (!isApk) return WEB
  try {
    return await GymHealth.status()
  } catch {
    return { status: 'unavailable', steps: false, writeWorkout: false }
  }
}

export async function connectHealth(): Promise<HealthStatus> {
  if (!isApk) return WEB
  return GymHealth.requestAccess()
}

export function openHealthSettings() {
  if (isApk) GymHealth.openSettings().catch(() => {})
}

/** Kroki z ostatnich `days` dni (ostatni element = dziś) albo null, gdy brak dostępu. */
export async function dailySteps(days = 7): Promise<DaySteps[] | null> {
  if (!isApk) return null
  try {
    return (await GymHealth.dailySteps({ days })).days
  } catch {
    return null
  }
}

/**
 * Aktywne kalorie do Health Connect: bez przemiany spoczynkowej (MET − 1),
 * bo Google Fit sam dolicza spoczynkowe — inaczej liczyłby je podwójnie.
 */
export function activeKcal(durationMs: number, weightKg: number | undefined) {
  if (!weightKg || durationMs <= 0 || durationMs > 4 * 3600_000) return undefined
  return Math.round(((STRENGTH_MET - 1) * weightKg * durationMs) / 3600_000)
}

/** Zapisuje zakończony trening w Health Connect. Po cichu nic nie robi, gdy brak APK lub zgody. */
export async function syncWorkoutToHealth(workoutId: number): Promise<boolean> {
  if (!isApk) return false
  try {
    const st = await GymHealth.status()
    if (!st.writeWorkout) return false
    const w = await db.workouts.get(workoutId)
    if (!w || w.status !== 'zakończony' || !w.endedAt) return false
    const weight = weightAt(await db.body.toArray(), w.startedAt)
    await GymHealth.saveWorkout({
      id: String(w.id),
      title: `Siłka · ${w.name}`,
      start: w.startedAt,
      end: w.endedAt,
      activeKcal: activeKcal(w.endedAt - w.startedAt, weight),
      version: Date.now(),
    })
    return true
  } catch {
    return false
  }
}
