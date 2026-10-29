import type { Exercise, Measure, WorkoutSet } from '../db'

/**
 * Sposób zapisu serii — co wpisujesz w treningu:
 * - ciężar: ciężar × powtórzenia (większość ćwiczeń; 0 kg = masa ciała),
 * - czas: sam czas serii (deska, skakanka),
 * - cardio: dystans i czas (bieżnia, rowerek, wioślarz, orbitrek),
 * - ciężar-dystans: ciężar i dystans (spacer farmera).
 */
export const MEASURES: { id: Measure; label: string; hint: string }[] = [
  { id: 'ciężar', label: 'Ciężar × powtórzenia', hint: 'np. wyciskanie, przysiad, podciąganie' },
  { id: 'czas', label: 'Czas', hint: 'np. deska, skakanka' },
  { id: 'cardio', label: 'Dystans i czas', hint: 'np. bieżnia, rowerek, wioślarz' },
  { id: 'ciężar-dystans', label: 'Ciężar i dystans', hint: 'np. spacer farmera' },
]

export const measureLabel = (m: Measure) => MEASURES.find((x) => x.id === m)?.label ?? m

/** Krótki opis sposobu zapisu na listach: „na czas”, „dystans i czas”. */
export function measureShort(m: Measure) {
  return m === 'czas' ? 'na czas' : m === 'cardio' ? 'dystans i czas' : m === 'ciężar-dystans' ? 'ciężar i dystans' : 'ciężar × powt.'
}

/** Które pola ma seria w danym sposobie zapisu. */
export function fieldsOf(m: Measure) {
  return {
    weight: m === 'ciężar' || m === 'ciężar-dystans',
    reps: m === 'ciężar',
    duration: m === 'czas' || m === 'cardio',
    distance: m === 'cardio' || m === 'ciężar-dystans',
  }
}

/** Wbudowane ćwiczenia, które nie są „ciężar × powtórzenia”. */
const BUILTIN: Record<string, Measure> = {
  'Deska (plank)': 'czas',
  Skakanka: 'czas',
  Bieżnia: 'cardio',
  Orbitrek: 'cardio',
  'Rowerek stacjonarny': 'cardio',
  'Wioślarz (ergometr)': 'cardio',
  'Spacer farmera': 'ciężar-dystans',
}

/** Bez polskich znaków i wielkich liter — do rozpoznawania nazw. */
function plain(s: string) {
  return s.toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Zgaduje sposób zapisu po nazwie (dla własnych ćwiczeń i importu z GymRun). */
export function guessMeasure(name: string): Measure {
  if (BUILTIN[name]) return BUILTIN[name]
  const n = plain(name)
  if (/farmer|spacer farmera|sanki|sled|prowler/.test(n)) return 'ciężar-dystans'
  if (/biezni|bieg|treadmill|orbitrek|elliptical|crosstrainer|rower|bike|wioslarz|ergometr|rowing|stepper|schody|marsz|cardio/.test(n))
    return 'cardio'
  if (/plank|deska|wall sit|krzeselko|hollow|l-sit|skakank|jump rope|zwis na drazku|dead hang/.test(n)) return 'czas'
  return 'ciężar'
}

/** Sposób zapisu ćwiczenia: ustawiony ręcznie, a gdy brak — zgadnięty po nazwie. */
export function measureOf(e: Pick<Exercise, 'name' | 'measure'> | undefined): Measure {
  if (!e) return 'ciężar'
  return e.measure ?? guessMeasure(e.name)
}

/** Wartości startowe dla nowej serii, gdy nie ma czego skopiować z ostatniego razu. */
export function defaultsFor(m: Measure): Pick<WorkoutSet, 'weightKg' | 'reps'> & Partial<Pick<WorkoutSet, 'durationSec' | 'distanceM'>> {
  switch (m) {
    case 'czas':
      return { weightKg: 0, reps: 0, durationSec: 30 }
    case 'cardio':
      return { weightKg: 0, reps: 0, durationSec: 20 * 60, distanceM: 0 }
    case 'ciężar-dystans':
      return { weightKg: 0, reps: 0, distanceM: 40 }
    default:
      return { weightKg: 0, reps: 8 }
  }
}
