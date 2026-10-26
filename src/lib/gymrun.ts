import { db, type Equipment, type Exercise, type MuscleGroup, type Workout, type WorkoutItem, type WorkoutSet } from '../db'

/**
 * Import historii z GymRun (eksport CSV: menu → Ustawienia → eksport).
 *
 * Format: separator „;”, jeden wiersz = jedna seria.
 * Date;Time;Routine;Exercise;Set;Weight;Reps;Duration;Distance;…;Note;Type;Book;Version1
 * - Book 1 = ciężar × powtórzenia, 6 = same powtórzenia (masa ciała), 7 = na czas (Duration w sekundach).
 * - Pusty ciężar albo 0 = masa ciała.
 * Jeden dzień w pliku = jeden trening. Treningi, które już są w aplikacji (ta sama godzina startu), są pomijane,
 * więc ten sam albo nowszy eksport można wczytać ponownie bez dublowania.
 */

/** Nazwy GymRun → nazwy z wbudowanej bazy Gym Lipka, żeby historia łączyła się z nowymi treningami. */
export const NAME_MAP: Record<string, string> = {
  'Przysiady ze sztangą na karku': 'Przysiad ze sztangą',
  'Wyciskanie sztangi na ławce poziomej': 'Wyciskanie sztangi na ławce płaskiej',
  'Wiosłowanie Kroc ze sztangielką (w opadzie)': 'Wiosłowanie hantlą',
  'Unoszenie ramion bokiem ze sztangielkami (stojąc)': 'Unoszenie hantli bokiem',
  'Naprzemienne uginanie ramion ze sztangielkami (siedząc)': 'Uginanie ramion z hantlami',
  'Prostowanie ramion na wyciągu (sznur)': 'Prostowanie ramion na wyciągu (linka)',
  'Plank (deska)': 'Deska (plank)',
  'Martwy ciąg ze sztangą': 'Martwy ciąg klasyczny',
  'Wyciskanie żołnierskie (stojąc)': 'Wyciskanie żołnierskie (OHP)',
  'Podciąganie podchwytem (wąsko)': 'Podciąganie podchwytem',
  'Ściąganie drążka do klatki (szeroko)': 'Ściąganie drążka wyciągu do klatki',
  'Wyciskanie sztangi wąsko (na ławce poziomej)': 'Wyciskanie sztangi wąsko',
  'Wspięcia na palce na suwnicy (wąsko)': 'Wspięcia na palce na suwnicy',
  'Wspięcia na palce na maszynie (siedząc)': 'Wspięcia na palce siedząc',
  'Allahy (spięcia na wyciągu klęcząc/siedząc)': 'Allahy (spięcia na wyciągu)',
  'Modlitewnik ze sztangą łamaną': 'Uginanie ramion na modlitewniku',
  'Wyciskanie sztangielek (skos dodatni)': 'Wyciskanie hantli na ławce skośnej',
  'Rumuński martwy ciąg ze sztangą (stojąc)': 'Martwy ciąg rumuński',
  'Wykroki ze sztangielkami': 'Wykroki z hantlami',
  'Przyciąganie linki wyciągu dolnego (siedząc)': 'Wiosłowanie na wyciągu dolnym siedząc',
  'Face Pulls (przyciąganie do twarzy)': 'Przyciąganie liny do twarzy (face pull)',
  'Unoszenie ramienia bokiem na wyciągu (jednorącz)': 'Unoszenie ramion bokiem na wyciągu',
  'Wypychanie nóg na suwnicy': 'Wypychanie na suwnicy (prasa)',
  'Uginanie nóg na maszynie (siedząc)': 'Uginanie nóg na maszynie siedząc',
  'Unoszenie kolan w podporze (poręcze)': 'Unoszenie kolan w podporze',
  'Wiosłowanie na maszynie typu Leverage': 'Wiosłowanie na maszynie',
}

/** Ćwiczenia bez odpowiednika w bazie — powstaną jako własne, z tą partią mięśni i sprzętem. */
export const NEW_EXERCISES: Record<string, [MuscleGroup, Equipment]> = {
  'Wiosłowanie sztangą podchwytem (Yates)': ['plecy', 'sztanga'],
  'Prostowanie ramion na wyciągu górnym (uchwyt V)': ['ramiona', 'wyciąg'],
  'Wspięcia na palce ze sztangą (stojąc)': ['nogi', 'sztanga'],
  'Wspięcia na palce na suwnicy Smitha (stojąc)': ['nogi', 'maszyna'],
  'Spider Curl ze sztangielkami': ['ramiona', 'hantle'],
  'Wyciskanie francuskie podchwytem (sztanga łamana)': ['ramiona', 'sztanga'],
}

export interface GymRunRow {
  /** Czas serii (ms, czas lokalny telefonu). */
  at: number
  day: string
  routine: string
  exercise: string
  weightKg: number
  reps: number
  durationSec?: number
  note?: string
}

export class GymRunError extends Error {}

/** Dzieli CSV na wiersze i pola; obsługuje cudzysłowy (np. „;” w notatce). */
export function splitCsv(text: string, sep: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"' && field === '') quoted = true
    else if (c === sep) {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((f) => f.trim() !== '')) rows.push(row)
      row = []
    } else field += c
  }
  row.push(field)
  if (row.some((f) => f.trim() !== '')) rows.push(row)
  return rows
}

function num(s: string | undefined) {
  const t = (s ?? '').trim().replace(',', '.')
  if (t === '') return 0
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}

/** „29.05.2026” + „04:54:02” → znacznik czasu w strefie telefonu. */
function parseWhen(date: string, time: string) {
  const d = date.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
  const t = time.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!d || !t) return NaN
  return new Date(+d[3], +d[2] - 1, +d[1], +t[1], +t[2], +(t[3] ?? 0)).getTime()
}

/** Czyta eksport GymRun. Rzuca GymRunError z opisem po polsku, gdy plik nie pasuje. */
export function parseGymRun(text: string): GymRunRow[] {
  const clean = text.replace(/^﻿/, '')
  const firstLine = clean.slice(0, clean.search(/\r?\n|$/))
  const sep = firstLine.split(';').length >= firstLine.split(',').length ? ';' : ','
  const [header, ...lines] = splitCsv(clean, sep)
  if (!header) throw new GymRunError('Plik jest pusty.')
  const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase())
  const c = { date: col('Date'), time: col('Time'), routine: col('Routine'), exercise: col('Exercise'), weight: col('Weight'), reps: col('Reps'), duration: col('Duration'), note: col('Note') }
  if (c.date < 0 || c.time < 0 || c.exercise < 0 || c.weight < 0 || c.reps < 0) {
    throw new GymRunError('To nie wygląda na eksport z GymRun — brakuje kolumn Date, Time, Exercise, Weight lub Reps.')
  }
  const out: GymRunRow[] = []
  lines.forEach((f, i) => {
    const at = parseWhen(f[c.date] ?? '', f[c.time] ?? '')
    const exercise = (f[c.exercise] ?? '').trim()
    const weightKg = num(f[c.weight])
    const reps = num(f[c.reps])
    const durationSec = c.duration >= 0 ? num(f[c.duration]) : 0
    if (!Number.isFinite(at) || !exercise || !Number.isFinite(weightKg) || !Number.isFinite(reps) || !Number.isFinite(durationSec)) {
      throw new GymRunError(`Nie rozumiem wiersza ${i + 2}: „${f.join(';').slice(0, 80)}”.`)
    }
    const note = c.note >= 0 ? (f[c.note] ?? '').trim() : ''
    out.push({
      at,
      day: (f[c.date] ?? '').trim(),
      routine: c.routine >= 0 ? (f[c.routine] ?? '').trim() : '',
      exercise,
      weightKg: Math.max(0, weightKg),
      reps: Math.max(0, Math.round(reps)),
      ...(durationSec > 0 ? { durationSec: Math.round(durationSec) } : {}),
      ...(note ? { note } : {}),
    })
  })
  if (out.length === 0) throw new GymRunError('W pliku nie ma żadnych serii.')
  return out
}

export interface PlannedWorkout {
  name: string
  startedAt: number
  endedAt: number
  /** Ćwiczenia w kolejności wykonania; exercise = nazwa w Gym Lipka. */
  items: { exercise: string; restSec: number; note?: string }[]
  sets: { exercise: string; order: number; weightKg: number; reps: number; durationSec?: number }[]
}

/** Nazwa ćwiczenia w Gym Lipka dla nazwy z GymRun. */
export function targetName(gymrunName: string) {
  return NAME_MAP[gymrunName] ?? gymrunName
}

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b)
  return s.length === 0 ? NaN : s[Math.floor((s.length - 1) / 2)]
}

/** Przerwa dla ćwiczenia: typowy odstęp między seriami, zaokrąglony do 15 s (45 s – 4 min, domyślnie 90 s). */
function restFrom(times: number[]) {
  const gaps = times.slice(1).map((t, i) => (t - times[i]) / 1000).filter((g) => g >= 30 && g <= 600)
  const m = median(gaps)
  if (!Number.isFinite(m)) return 90
  return Math.min(240, Math.max(45, Math.round(m / 15) * 15))
}

/** Układa serie w treningi: jeden dzień = jeden trening, ćwiczenia i serie w kolejności wykonania. */
export function planWorkouts(rows: GymRunRow[]): PlannedWorkout[] {
  const byDay = new Map<string, GymRunRow[]>()
  for (const r of rows) {
    const list = byDay.get(r.day) ?? []
    list.push(r)
    byDay.set(r.day, list)
  }
  const out: PlannedWorkout[] = []
  for (const list of byDay.values()) {
    const ordered = list.map((r, i) => ({ r, i })).sort((a, b) => a.r.at - b.r.at || a.i - b.i).map((x) => x.r)
    const items: PlannedWorkout['items'] = []
    const sets: PlannedWorkout['sets'] = []
    const perExercise = new Map<string, GymRunRow[]>()
    for (const r of ordered) {
      const name = targetName(r.exercise)
      const own = perExercise.get(name) ?? []
      if (own.length === 0) items.push({ exercise: name, restSec: 90 })
      own.push(r)
      perExercise.set(name, own)
      sets.push({ exercise: name, order: own.length - 1, weightKg: r.weightKg, reps: r.reps, ...(r.durationSec ? { durationSec: r.durationSec } : {}) })
    }
    for (const it of items) {
      const own = perExercise.get(it.exercise)!
      it.restSec = restFrom(own.map((r) => r.at))
      const notes = [...new Set(own.map((r) => r.note).filter(Boolean))]
      if (notes.length) it.note = notes.join(' · ')
    }
    const routines = [...new Set(ordered.map((r) => r.routine).filter(Boolean))]
    out.push({
      name: routines.join(' + ') || 'Trening z GymRun',
      startedAt: ordered[0].at,
      endedAt: ordered[ordered.length - 1].at,
      items,
      sets,
    })
  }
  return out.sort((a, b) => a.startedAt - b.startedAt)
}

export interface ImportPreview {
  workouts: PlannedWorkout[]
  /** Treningi do dodania (bez tych, które już są w aplikacji). */
  fresh: PlannedWorkout[]
  skipped: number
  sets: number
  newExercises: string[]
  from: number
  to: number
}

/** Sprawdza plik i porównuje z bazą — nic jeszcze nie zapisuje. */
export async function previewGymRun(text: string): Promise<ImportPreview> {
  const workouts = planWorkouts(parseGymRun(text))
  const existing = new Set((await db.workouts.toArray()).map((w) => w.startedAt))
  const fresh = workouts.filter((w) => !existing.has(w.startedAt))
  const known = new Set((await db.exercises.toArray()).map((e) => e.name))
  const names = new Set(fresh.flatMap((w) => w.items.map((i) => i.exercise)))
  return {
    workouts,
    fresh,
    skipped: workouts.length - fresh.length,
    sets: fresh.reduce((a, w) => a + w.sets.length, 0),
    newExercises: [...names].filter((n) => !known.has(n)).sort((a, b) => a.localeCompare(b, 'pl')),
    from: workouts[0].startedAt,
    to: workouts[workouts.length - 1].startedAt,
  }
}

/** Zapisuje treningi z podglądu. Wszystko albo nic — błąd w połowie niczego nie zostawia. Zwraca liczbę treningów. */
export async function importGymRun(preview: ImportPreview): Promise<number> {
  return db.transaction('rw', db.exercises, db.workouts, db.sets, async () => {
    const ids = new Map((await db.exercises.toArray()).map((e) => [e.name, e.id]))
    for (const name of new Set(preview.fresh.flatMap((w) => w.items.map((i) => i.exercise)))) {
      if (ids.has(name)) continue
      const [muscle, equipment] = NEW_EXERCISES[name] ?? ['inne', 'inne']
      ids.set(name, await db.exercises.add({ name, muscle, equipment, custom: true } as Exercise))
    }
    const taken = new Set((await db.workouts.toArray()).map((w) => w.startedAt))
    let added = 0
    for (const w of preview.fresh) {
      if (taken.has(w.startedAt)) continue
      const workoutId = await db.workouts.add({
        name: w.name,
        startedAt: w.startedAt,
        endedAt: w.endedAt,
        status: 'zakończony',
        source: 'gymrun',
        items: w.items.map((i) => ({ exerciseId: ids.get(i.exercise)!, restSec: i.restSec, ...(i.note ? { note: i.note } : {}) }) as WorkoutItem),
      } as Workout)
      await db.sets.bulkAdd(
        w.sets.map(
          (s) =>
            ({
              workoutId,
              exerciseId: ids.get(s.exercise)!,
              order: s.order,
              type: 'robocza',
              weightKg: s.weightKg,
              reps: s.reps,
              ...(s.durationSec ? { durationSec: s.durationSec } : {}),
              done: true,
            }) as WorkoutSet,
        ),
      )
      added++
    }
    return added
  })
}
