import { describe, expect, it } from 'vitest'
import { BUILTIN_EXERCISES } from '../data/exercises'
import { guessMeasure, measureOf } from './measure'
import { meters, secs, setLabel, setLabelAs } from './format'
import { prFor, type Bests } from './stats'
import { suggest } from './progress'
import type { Exercise, WorkoutSet } from '../db'

describe('sposób zapisu ćwiczeń', () => {
  it('wbudowana baza: cardio na dystans i czas, deska na czas, reszta na ciężar', () => {
    const by = Object.fromEntries(BUILTIN_EXERCISES.map(([n]) => [n, guessMeasure(n)]))
    expect(by['Bieżnia']).toBe('cardio')
    expect(by['Orbitrek']).toBe('cardio')
    expect(by['Rowerek stacjonarny']).toBe('cardio')
    expect(by['Wioślarz (ergometr)']).toBe('cardio')
    expect(by['Deska (plank)']).toBe('czas')
    expect(by['Skakanka']).toBe('czas')
    expect(by['Spacer farmera']).toBe('ciężar-dystans')
    const special = new Set(['Bieżnia', 'Orbitrek', 'Rowerek stacjonarny', 'Wioślarz (ergometr)', 'Deska (plank)', 'Skakanka', 'Spacer farmera'])
    for (const [n, m] of Object.entries(by)) if (!special.has(n)) expect([n, m]).toEqual([n, 'ciężar'])
  })

  it('własne ćwiczenia: zgadywanie po nazwie, ręczny wybór wygrywa', () => {
    expect(guessMeasure('Bieg na bieżni')).toBe('cardio')
    expect(guessMeasure('Plank boczny')).toBe('czas')
    expect(guessMeasure('Wiosłowanie sztangą podchwytem (Yates)')).toBe('ciężar')
    expect(measureOf({ name: 'Bieżnia', measure: 'czas' })).toBe('czas')
  })
})

describe('opisy serii', () => {
  it('czas i dystans', () => {
    expect(secs(45)).toBe('45 s')
    expect(secs(150)).toBe('2:30')
    expect(secs(1800)).toBe('30 min')
    expect(meters(400)).toBe('400 m')
    expect(meters(2500)).toBe('2,5 km')
    expect(setLabel(0, 0, 1800, 5000)).toBe('5 km · 30 min')
    expect(setLabel(32, 0, undefined, 40)).toBe('32 × 40 m')
    expect(setLabel(0, 0, 60)).toBe('60 s')
    expect(setLabel(80, 8)).toBe('80 × 8')
  })

  it('według sposobu zapisu', () => {
    expect(setLabelAs('cardio', { weightKg: 0, reps: 0, durationSec: 1200, distanceM: 0 })).toBe('20 min')
    expect(setLabelAs('czas', { weightKg: 0, reps: 0, durationSec: 45 }, true)).toBe('45 s')
    expect(setLabelAs('ciężar-dystans', { weightKg: 30, reps: 0, distanceM: 40 }, true)).toBe('30 kg × 40 m')
    expect(setLabelAs('ciężar', { weightKg: 0, reps: 10 }, true)).toBe('masa ciała × 10')
  })
})

describe('rekordy czasu i dystansu', () => {
  const b: Bests = { maxWeight: 0, maxWeightReps: 0, bestE1rm: 0, repsAt: new Map(), maxDuration: 60, maxDistance: 3000 }
  const s = (p: Partial<WorkoutSet>) => ({ weightKg: 0, reps: 0, type: 'robocza' as const, done: true, ...p })
  it('dłuższa deska = rekord czasu, dalej na bieżni = rekord dystansu', () => {
    expect(prFor(s({ durationSec: 75 }), b)).toBe('Rekord czasu')
    expect(prFor(s({ durationSec: 50 }), b)).toBeNull()
    expect(prFor(s({ distanceM: 3500, durationSec: 1200 }), b)).toBe('Rekord dystansu')
    expect(prFor(s({ distanceM: 2000, durationSec: 1200 }), b)).toBeNull()
  })
})

describe('asystent progresji', () => {
  it('nie podpowiada ciężaru przy bieżni ani desce', () => {
    const last = [{ id: 1, workoutId: 1, exerciseId: 1, order: 0, type: 'robocza', weightKg: 0, reps: 0, durationSec: 60, done: true }] as WorkoutSet[]
    expect(suggest({ name: 'Deska (plank)' } as Exercise, undefined, last)).toBeNull()
    expect(suggest({ name: 'Bieżnia' } as Exercise, undefined, last)).toBeNull()
  })
})
