import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { BUILTIN_EXERCISES } from '../data/exercises'
import { db, ensureSeed } from '../db'
import { setLabel } from './format'
import { GymRunError, NAME_MAP, importGymRun, parseGymRun, planWorkouts, previewGymRun } from './gymrun'

// Mały, zmyślony eksport w formacie GymRun: ciężar z kropką, masa ciała, deska na czas, superserie, notatki, „;” w cudzysłowie.
const HEADER = 'Date;Time;Routine;Exercise;Set;Weight;Reps;Duration;Distance;Para6;Para7;Para8;Para9;Para10;Note;Type;Book;Version1'
const SAMPLE = [
  HEADER,
  '01.06.2026;05:45:41;Plan A;Przysiady ze sztangą na karku;1;45;5;;;;;;;;;1;1;1',
  '01.06.2026;05:48:41;Plan A;Przysiady ze sztangą na karku;2;47.5;5;;;;;;;;kolano;1;1;1',
  '01.06.2026;05:51:41;Plan A;Przysiady ze sztangą na karku;3;47.5;4;;;;;;;;"ciężko; ale ok";1;1;1',
  '01.06.2026;06:37:52;Plan A;Spider Curl ze sztangielkami;1;10;8;;;;;;;;;1;1;1',
  '01.06.2026;06:37:54;Plan A;Prostowanie ramion na wyciągu (sznur);1;50;8;;;;;;;;;1;1;1',
  '01.06.2026;06:39:14;Plan A;Spider Curl ze sztangielkami;2;10;8;;;;;;;;;1;1;1',
  '01.06.2026;06:50:44;Plan A;Plank (deska);1;;;60;;;;;;;;1;7;1',
  '04.06.2026;06:41:39;Plan B;Podciąganie podchwytem (wąsko);1;;4;;;;;;;;;1;1;1',
  '04.06.2026;06:45:15;Plan B;Podciąganie podchwytem (wąsko);2;0;3;;;;;;;;;1;1;1',
  '04.06.2026;07:12:58;Plan B;Unoszenie kolan w podporze (poręcze);1;;10;;;;;;;;;1;6;1',
].join('\r\n')

describe('parseGymRun', () => {
  it('czyta serie, ciężary z kropką, masę ciała, czas i notatki', () => {
    const rows = parseGymRun('﻿' + SAMPLE)
    expect(rows).toHaveLength(10)
    expect(rows[1]).toMatchObject({ exercise: 'Przysiady ze sztangą na karku', weightKg: 47.5, reps: 5, note: 'kolano', routine: 'Plan A' })
    expect(rows[2].note).toBe('ciężko; ale ok')
    expect(rows[6]).toMatchObject({ weightKg: 0, reps: 0, durationSec: 60 })
    expect(rows[7]).toMatchObject({ weightKg: 0, reps: 4 })
    expect(new Date(rows[0].at)).toEqual(new Date(2026, 5, 1, 5, 45, 41))
  })

  it('odrzuca plik, który nie jest eksportem GymRun', () => {
    expect(() => parseGymRun('a;b;c\n1;2;3')).toThrow(GymRunError)
    expect(() => parseGymRun(HEADER)).toThrow('nie ma żadnych serii')
    expect(() => parseGymRun(HEADER + '\n99.99.2026;05:00:00;X;Y;1;abc;5')).toThrow('wiersza 2')
  })
})

describe('planWorkouts', () => {
  it('jeden dzień = jeden trening, kolejność ćwiczeń i serii jak na siłowni', () => {
    const ws = planWorkouts(parseGymRun(SAMPLE))
    expect(ws.map((w) => w.name)).toEqual(['Plan A', 'Plan B'])
    const a = ws[0]
    expect(a.items.map((i) => i.exercise)).toEqual([
      'Przysiad ze sztangą',
      'Spider Curl ze sztangielkami',
      'Prostowanie ramion na wyciągu (linka)',
      'Deska (plank)',
    ])
    expect(a.items[0]).toMatchObject({ restSec: 180, note: 'kolano · ciężko; ale ok' })
    expect(a.sets.filter((s) => s.exercise === 'Spider Curl ze sztangielkami').map((s) => s.order)).toEqual([0, 1])
    expect(a.sets.find((s) => s.exercise === 'Deska (plank)')).toMatchObject({ durationSec: 60, reps: 0 })
    expect(a.endedAt - a.startedAt).toBe((6 * 3600 + 50 * 60 + 44 - (5 * 3600 + 45 * 60 + 41)) * 1000)
  })
})

describe('mapowanie nazw', () => {
  it('każda docelowa nazwa istnieje w bazie ćwiczeń', () => {
    const builtin = new Set(BUILTIN_EXERCISES.map(([n]) => n))
    for (const target of Object.values(NAME_MAP)) expect(builtin, target).toContain(target)
  })
})

describe('importGymRun', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await ensureSeed()
  })

  it('zapisuje treningi, tworzy brakujące ćwiczenia i nie dubluje przy ponownym imporcie', async () => {
    const preview = await previewGymRun(SAMPLE)
    expect(preview).toMatchObject({ skipped: 0, sets: 10 })
    expect(preview.newExercises).toEqual(['Spider Curl ze sztangielkami'])
    expect(await importGymRun(preview)).toBe(2)

    const workouts = await db.workouts.orderBy('startedAt').toArray()
    expect(workouts.map((w) => [w.name, w.status, w.source])).toEqual([
      ['Plan A', 'zakończony', 'gymrun'],
      ['Plan B', 'zakończony', 'gymrun'],
    ])
    const spider = await db.exercises.where('name').equals('Spider Curl ze sztangielkami').first()
    expect(spider).toMatchObject({ muscle: 'ramiona', equipment: 'hantle', custom: true })
    const squat = await db.exercises.where('name').equals('Przysiad ze sztangą').first()
    const squatSets = await db.sets.where('exerciseId').equals(squat!.id).sortBy('order')
    expect(squatSets.map((s) => setLabel(s.weightKg, s.reps, s.durationSec))).toEqual(['45 × 5', '47,5 × 5', '47,5 × 4'])
    expect(squatSets.every((s) => s.done && s.type === 'robocza')).toBe(true)

    const again = await previewGymRun(SAMPLE)
    expect(again).toMatchObject({ skipped: 2, sets: 0 })
    expect(again.fresh).toHaveLength(0)
    expect(await db.workouts.count()).toBe(2)
  })
})

// Pełny eksport Piotra sprawdzamy tylko lokalnie: GYMRUN_CSV=/ścieżka/do/pliku.csv npm test
const full = process.env.GYMRUN_CSV
describe.runIf(full)('prawdziwy eksport', () => {
  it('wczytuje się w całości', async () => {
    await db.delete()
    await db.open()
    await ensureSeed()
    const preview = await previewGymRun(readFileSync(full!, 'utf8'))
    console.log(`treningi: ${preview.fresh.length}, serie: ${preview.sets}, nowe ćwiczenia: ${preview.newExercises.join(' | ')}`)
    expect(await importGymRun(preview)).toBe(preview.fresh.length)
    expect(await db.sets.count()).toBe(preview.sets)
  })
})
