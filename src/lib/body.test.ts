import { describe, expect, it } from 'vitest'
import type { BodyMeasurement } from '../db'
import { latest, parseNum, seriesOf, summary } from './body'
import { weightAt } from './kcal'

const all: BodyMeasurement[] = [
  { id: 1, date: 100, weightKg: 82, fatPct: 20 },
  { id: 2, date: 200, waistCm: 88 },
  { id: 3, date: 300, weightKg: 81.4, fatPct: 19.5 },
]

describe('pomiary ciała', () => {
  it('seria jednej miary pomija pomiary bez niej', () => {
    expect(seriesOf(all, 'weightKg').map((p) => p.y)).toEqual([82, 81.4])
  })
  it('najnowsze wartości ze zmianą', () => {
    const t = latest(all)
    expect(t.map((x) => x.metric.key)).toEqual(['weightKg', 'fatPct', 'waistCm'])
    expect(t[0].delta).toBeCloseTo(-0.6)
    expect(t[2].delta).toBeUndefined()
  })
  it('opis pomiaru i wpisywanie z przecinkiem', () => {
    expect(summary(all[2])).toBe('81,4 kg · Tłuszcz 19,5 %')
    expect(parseNum('77,5')).toBe(77.5)
    expect(parseNum('')).toBeUndefined()
  })
  it('kalorie biorą wagę tylko z pomiarów z wagą', () => {
    expect(weightAt(all, 250)).toBe(82)
  })
})
