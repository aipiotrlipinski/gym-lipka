import { describe, expect, it } from 'vitest'
import type { BodyMeasurement } from '../db'
import { weightAt, workoutKcal } from './kcal'

const day = 86_400_000
const body: BodyMeasurement[] = [
  { id: 2, date: 10 * day, weightKg: 84 },
  { id: 1, date: 1 * day, weightKg: 86 },
]

describe('kcal', () => {
  it('liczy MET × kg × h', () => {
    // 5 MET × 80 kg × 1 h = 400 kcal
    expect(workoutKcal(3600_000, 80)).toBe(400)
    expect(workoutKcal(45 * 60_000, 84)).toBe(315)
  })

  it('bez masy ciała albo z podejrzanym czasem zwraca undefined', () => {
    expect(workoutKcal(3600_000, undefined)).toBeUndefined()
    expect(workoutKcal(0, 80)).toBeUndefined()
    expect(workoutKcal(5 * 3600_000, 80)).toBeUndefined()
  })

  it('bierze masę ciała z dnia treningu', () => {
    expect(weightAt(body, 5 * day)).toBe(86)
    expect(weightAt(body, 12 * day)).toBe(84)
    expect(weightAt(body, 0)).toBe(86) // przed pierwszym pomiarem — najwcześniejszy
    expect(weightAt([], 5 * day)).toBeUndefined()
  })
})
