import type { Measure, WorkoutSet } from '../db'

/** 77.5 → "77,5"; 80 → "80". */
export function kg(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace('.', ',')
}

/** Czas serii: "45 s", "120 s", "2:30", "30 min". */
export function secs(sec: number) {
  const s = Math.max(0, Math.round(sec))
  if (s <= 120) return `${s} s`
  if (s % 60 === 0) return `${s / 60} min`
  return clock(s)
}

/** Dystans: "400 m", "2,5 km". */
export function meters(m: number) {
  const v = Math.max(0, Math.round(m))
  return v >= 1000 ? `${kg(Math.round(v / 10) / 100)} km` : `${v} m`
}

/**
 * Seria jako tekst: "80 × 8", przy masie ciała bez obciążenia "MC × 8", seria na czas "60 s" (z obciążeniem "10 × 60 s"),
 * cardio "5 km · 30 min", spacer farmera "32 × 40 m".
 */
export function setLabel(weightKg: number, reps: number, durationSec?: number, distanceM?: number) {
  if (distanceM) {
    const d = meters(distanceM)
    if (durationSec) return `${d} · ${secs(durationSec)}`
    return weightKg > 0 ? `${kg(weightKg)} × ${d}` : d
  }
  if (durationSec) return weightKg > 0 ? `${kg(weightKg)} × ${secs(durationSec)}` : secs(durationSec)
  return `${weightKg === 0 ? 'MC' : kg(weightKg)} × ${reps}`
}

/** Seria jako tekst według sposobu zapisu ćwiczenia — pokazuje też puste pola (np. świeża seria na czas). */
export function setLabelAs(
  m: Measure,
  s: Pick<WorkoutSet, 'weightKg' | 'reps' | 'durationSec' | 'distanceM'>,
  units = false,
) {
  const w = s.weightKg === 0 ? (units ? 'masa ciała' : 'MC') : units ? `${kg(s.weightKg)} kg` : kg(s.weightKg)
  switch (m) {
    case 'czas':
      return s.weightKg > 0 ? `${w} × ${secs(s.durationSec ?? 0)}` : secs(s.durationSec ?? 0)
    case 'cardio': {
      const parts = [s.distanceM ? meters(s.distanceM) : '', s.durationSec ? secs(s.durationSec) : ''].filter(Boolean)
      return parts.length ? parts.join(' · ') : '—'
    }
    case 'ciężar-dystans':
      return `${w} × ${meters(s.distanceM ?? 0)}`
    default:
      return `${w} × ${s.reps}`
  }
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
