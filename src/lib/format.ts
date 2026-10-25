import type { WorkoutSet } from '../db'

/** 77.5 → "77,5"; 80 → "80". */
export function kg(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace('.', ',')
}

/** Seria jako tekst: "80 × 8", przy masie ciała bez obciążenia "MC × 8". */
export function setLabel(weightKg: number, reps: number) {
  return `${weightKg === 0 ? 'MC' : kg(weightKg)} × ${reps}`
}

/** Sekundy → "1:24" albo "1:02:15". */
export function clock(totalSec: number) {
  const s = Math.max(0, Math.round(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** Czas trwania treningu: "58 min" albo "1 h 12 min". */
export function duration(ms: number) {
  const min = Math.max(1, Math.round(ms / 60000))
  return min < 60 ? `${min} min` : min % 60 === 0 ? `${min / 60} h` : `${Math.floor(min / 60)} h ${min % 60} min`
}

/** Szacowany ciężar maksymalny na 1 powtórzenie (wzór Epleya). */
export function e1rm(weightKg: number, reps: number) {
  if (reps <= 0 || weightKg <= 0) return 0
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30)
}

/** Objętość = suma ciężar × powtórzenia z zaliczonych serii (bez rozgrzewki). */
export function volume(sets: WorkoutSet[]) {
  return sets.filter((s) => s.done && s.type !== 'rozgrzewka').reduce((a, s) => a + s.weightKg * s.reps, 0)
}

/** 9840 → "9 840". */
export function thousands(n: number) {
  return Math.round(n).toLocaleString('pl-PL')
}

export function shortDate(ts: number) {
  return new Date(ts).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'numeric' })
}

export function longDate(ts: number) {
  return new Date(ts).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
}

/** Odmiana: 1 seria, 2 serie, 5 serii. */
export function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one
  const d = n % 10
  const t = n % 100
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many
}
