import type { BodyMeasurement } from '../db'

/**
 * Pomiary ciała: skład ciała (waga z analizą) i obwody centymetrem.
 * Każdy pomiar zapisuje tylko wpisane pola — reszta zostaje pusta.
 */

export type MetricKey =
  | 'weightKg'
  | 'fatPct'
  | 'waterPct'
  | 'muscleKg'
  | 'boneKg'
  | 'visceral'
  | 'proteinPct'
  | 'bmrKcal'
  | 'metabolicAge'
  | 'neckCm'
  | 'chestCm'
  | 'armCm'
  | 'forearmCm'
  | 'waistCm'
  | 'bellyCm'
  | 'hipsCm'
  | 'thighCm'
  | 'calfCm'

export interface Metric {
  key: MetricKey
  label: string
  /** Krótka nazwa do kafelka i listy. */
  short: string
  unit: string
  group: 'sklad' | 'obwody'
  /** Liczba miejsc po przecinku przy wpisywaniu. */
  decimals: 0 | 1
  /** Spadek jest dobry (np. tłuszcz) — strzałka zmiany na zielono przy spadku. */
  lowerIsBetter?: boolean
}

export const METRICS: Metric[] = [
  { key: 'weightKg', label: 'Waga', short: 'Waga', unit: 'kg', group: 'sklad', decimals: 1 },
  { key: 'fatPct', label: 'Tkanka tłuszczowa', short: 'Tłuszcz', unit: '%', group: 'sklad', decimals: 1, lowerIsBetter: true },
  { key: 'waterPct', label: 'Woda w organizmie', short: 'Woda', unit: '%', group: 'sklad', decimals: 1 },
  { key: 'muscleKg', label: 'Masa mięśniowa', short: 'Mięśnie', unit: 'kg', group: 'sklad', decimals: 1 },
  { key: 'boneKg', label: 'Masa kostna', short: 'Kości', unit: 'kg', group: 'sklad', decimals: 1 },
  { key: 'visceral', label: 'Tłuszcz trzewny (poziom)', short: 'Trzewny', unit: '', group: 'sklad', decimals: 0, lowerIsBetter: true },
  { key: 'proteinPct', label: 'Białko', short: 'Białko', unit: '%', group: 'sklad', decimals: 1 },
  { key: 'bmrKcal', label: 'Przemiana materii (BMR)', short: 'BMR', unit: 'kcal', group: 'sklad', decimals: 0 },
  { key: 'metabolicAge', label: 'Wiek metaboliczny', short: 'Wiek met.', unit: 'lat', group: 'sklad', decimals: 0, lowerIsBetter: true },
  { key: 'neckCm', label: 'Szyja', short: 'Szyja', unit: 'cm', group: 'obwody', decimals: 1 },
  { key: 'chestCm', label: 'Klatka piersiowa', short: 'Klatka', unit: 'cm', group: 'obwody', decimals: 1 },
  { key: 'armCm', label: 'Ramię (biceps)', short: 'Ramię', unit: 'cm', group: 'obwody', decimals: 1 },
  { key: 'forearmCm', label: 'Przedramię', short: 'Przedramię', unit: 'cm', group: 'obwody', decimals: 1 },
  { key: 'waistCm', label: 'Talia', short: 'Talia', unit: 'cm', group: 'obwody', decimals: 1, lowerIsBetter: true },
  { key: 'bellyCm', label: 'Brzuch (na wysokości pępka)', short: 'Brzuch', unit: 'cm', group: 'obwody', decimals: 1, lowerIsBetter: true },
  { key: 'hipsCm', label: 'Biodra', short: 'Biodra', unit: 'cm', group: 'obwody', decimals: 1 },
  { key: 'thighCm', label: 'Udo', short: 'Udo', unit: 'cm', group: 'obwody', decimals: 1 },
  { key: 'calfCm', label: 'Łydka', short: 'Łydka', unit: 'cm', group: 'obwody', decimals: 1 },
]

export const metric = (k: MetricKey) => METRICS.find((m) => m.key === k)!

/** Wartość jako tekst: „80,2”, „12”. */
export function fmtValue(v: number, m: Metric) {
  return v.toFixed(m.decimals).replace('.', ',')
}

export function withUnit(v: number, m: Metric) {
  return m.unit ? `${fmtValue(v, m)} ${m.unit}` : fmtValue(v, m)
}

/** Seria wartości jednej miary w czasie (od najstarszej). */
export function seriesOf(all: BodyMeasurement[], k: MetricKey) {
  return [...all]
    .sort((a, b) => a.date - b.date)
    .filter((b) => typeof b[k] === 'number')
    .map((b) => ({ x: b.date, y: b[k] as number }))
}

/** Najnowsza wartość każdej miary i zmiana względem poprzedniej. Tylko miary, które mają dane. */
export function latest(all: BodyMeasurement[]) {
  return METRICS.flatMap((m) => {
    const s = seriesOf(all, m.key)
    if (s.length === 0) return []
    const last = s[s.length - 1]
    const prev = s[s.length - 2]
    return [{ metric: m, value: last.y, date: last.x, delta: prev ? last.y - prev.y : undefined }]
  })
}

/** Krótki opis pomiaru do listy: „80,2 kg · Tłuszcz 18,5 % · Talia 86 cm”. */
export function summary(b: BodyMeasurement) {
  return METRICS.filter((m) => typeof b[m.key] === 'number')
    .map((m) => (m.key === 'weightKg' ? withUnit(b[m.key]!, m) : `${m.short} ${withUnit(b[m.key]!, m)}`))
    .join(' · ')
}

/** Tekst z pola → liczba albo undefined (puste / niepoprawne pole). */
export function parseNum(text: string): number | undefined {
  const n = parseFloat(text.replace(',', '.').trim())
  return Number.isFinite(n) && n > 0 ? n : undefined
}
