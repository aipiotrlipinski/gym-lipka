import { describe, expect, it } from 'vitest'
import type { Exercise } from '../db'
import { BUILTIN_EXERCISES } from '../data/exercises'
import { EXERCISE_MUSCLES, MUSCLE_LIST, muscleAt, muscleIndex } from '../data/muscles'
import { NEW_EXERCISES } from './gymrun'
import { exercisesFor, fmtSets, level, muscleVolume, targetsOf } from './muscleMap'
import { FRONT, BACK } from '../components/bodyShapes'

const ex = (id: number, name: string, muscle: Exercise['muscle'] = 'inne'): Exercise => ({ id, name, muscle, equipment: 'inne', custom: false })

describe('mapa mięśni', () => {
  it('każde wbudowane ćwiczenie ma przypisane mięśnie (i odwrotnie — bez literówek w nazwach)', () => {
    const names = new Set(BUILTIN_EXERCISES.map(([n]) => n))
    for (const n of names) expect(EXERCISE_MUSCLES[n], n).toBeDefined()
    for (const n of Object.keys(EXERCISE_MUSCLES)) expect(names.has(n), n).toBe(true)
    for (const [n, [p]] of Object.entries(EXERCISE_MUSCLES)) expect(p.length, n).toBeGreaterThan(0)
  })

  it('każdy mięsień da się kliknąć na rysunku i ma jakieś ćwiczenie główne', () => {
    const drawn = new Set([...FRONT.muscles, ...BACK.muscles].map((m) => m.id))
    const all = BUILTIN_EXERCISES.map(([n, m], i) => ex(i + 1, n, m))
    for (const m of MUSCLE_LIST) {
      expect(drawn.has(m.id), m.id).toBe(true)
      expect(exercisesFor(m.id, all).primary.length, m.id).toBeGreaterThan(0)
    }
  })

  it('własne ćwiczenia: mięśnie zgadnięte po nazwie, a w ostateczności po partii', () => {
    const t = (name: string, m: Exercise['muscle'] = 'inne') => targetsOf({ name, muscle: m })[0]
    expect(t('Wspięcia na palce ze sztangą (stojąc)', 'nogi')).toEqual(['lydki'])
    expect(t('Spider Curl ze sztangielkami', 'ramiona')).toEqual(['biceps'])
    expect(t('Wyciskanie francuskie podchwytem (sztanga łamana)', 'ramiona')).toEqual(['triceps'])
    expect(t('Prostowanie ramion na wyciągu górnym (uchwyt V)', 'ramiona')).toEqual(['triceps'])
    expect(t('Wiosłowanie sztangą podchwytem (Yates)', 'plecy')).toEqual(['najszersze'])
    expect(t('Uginanie nóg jednonóż', 'nogi')).toEqual(['dwuglowe'])
    expect(t('Moje dziwne ćwiczenie', 'klatka')).toEqual(['klatka'])
    expect(t('Coś innego', 'inne')).toEqual([])
    for (const [n, [m]] of Object.entries(NEW_EXERCISES)) expect(t(n, m).length, n).toBeGreaterThan(0)
  })

  it('serie: główny mięsień w całości, pomocniczy w połowie, bez rozgrzewek i niezrobionych', () => {
    const bench = ex(1, 'Wyciskanie sztangi na ławce płaskiej', 'klatka')
    const map = new Map([[1, bench]])
    const s = (done: boolean, type: 'robocza' | 'rozgrzewka' = 'robocza') => ({ exerciseId: 1, done, type })
    const v = muscleVolume([s(true), s(true), s(true), s(true, 'rozgrzewka'), s(false), { ...s(true), exerciseId: 99 }], map)
    expect(v.klatka).toBe(3)
    expect(v.triceps).toBe(1.5)
    expect(v['barki-przod']).toBe(1.5)
    expect(v.lydki).toBe(0)
  })

  it('poziom koloru według serii na tydzień', () => {
    expect(level(0, 7)).toBe(0)
    expect(level(2, 7)).toBe(1)
    expect(level(6, 7)).toBe(2)
    expect(level(10, 7)).toBe(3)
    expect(level(15, 7)).toBe(4)
    expect(level(40, 30)).toBe(3) // 40 serii w 30 dni ≈ 9,3 na tydzień
  })

  it('numer mięśnia w adresie działa w obie strony', () => {
    for (const m of MUSCLE_LIST) expect(muscleAt(muscleIndex(m.id))?.id).toBe(m.id)
    expect(muscleAt(0)).toBeUndefined()
    expect(muscleAt(99)).toBeUndefined()
    expect(fmtSets(4.5)).toBe('4,5')
    expect(fmtSets(3)).toBe('3')
  })
})
