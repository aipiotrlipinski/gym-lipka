import type { BodyMeasurement } from '../db'

/**
 * Szacunek spalonych kalorii dla treningu siłowego bez zegarka.
 * Wzór: MET × masa ciała [kg] × czas [h]. MET 5,0 to umiarkowanie intensywny
 * trening oporowy (Compendium of Physical Activities: 3,5 lekki — 6,0 intensywny).
 * Wynik jest przybliżony — w aplikacji pokazujemy go z „~”.
 */
export const STRENGTH_MET = 5.0

/** Masa ciała z dnia treningu: ostatni pomiar sprzed treningu, a gdy takiego nie ma — najwcześniejszy późniejszy. */
export function weightAt(body: BodyMeasurement[], at: number): number | undefined {
  const sorted = body.filter((b) => typeof b.weightKg === 'number').sort((a, b) => a.date - b.date)
  if (sorted.length === 0) return undefined
  const before = sorted.filter((b) => b.date <= at)
  return (before[before.length - 1] ?? sorted[0]).weightKg
}

/** Zaokrąglone kcal albo undefined, gdy nie da się policzyć (brak masy ciała lub czasu). */
export function workoutKcal(durationMs: number, weightKg: number | undefined, met = STRENGTH_MET): number | undefined {
  if (!weightKg || weightKg <= 0 || durationMs <= 0) return undefined
  // Treningi dłuższe niż 4 h to prawie na pewno niezamknięty trening — nie liczymy z nich kcal.
  if (durationMs > 4 * 3600_000) return undefined
  return Math.round((met * weightKg * durationMs) / 3600_000)
}
