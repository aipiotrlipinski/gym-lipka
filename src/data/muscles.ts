import type { MuscleGroup } from '../db'

/** Mięśnie na mapie ciała. Dokładniejsze niż partie w bazie ćwiczeń (klatka, plecy, nogi…). */
export type MuscleId =
  | 'klatka'
  | 'barki-przod'
  | 'barki-bok'
  | 'barki-tyl'
  | 'biceps'
  | 'triceps'
  | 'przedramiona'
  | 'brzuch'
  | 'skosne'
  | 'kaptury'
  | 'najszersze'
  | 'prostowniki'
  | 'posladki'
  | 'czworoglowe'
  | 'dwuglowe'
  | 'przywodziciele'
  | 'lydki'

export interface Muscle {
  id: MuscleId
  label: string
  /** Widok, na którym mięsień widać najlepiej (tam przełącza się mapa po wyborze z listy). */
  side: 'przod' | 'tyl'
}

/** Kolejność = kolejność w liście pod mapą. Numer w adresie (#/miesnie/3) to pozycja na tej liście + 1. */
export const MUSCLE_LIST: Muscle[] = [
  { id: 'klatka', label: 'Klatka piersiowa', side: 'przod' },
  { id: 'barki-przod', label: 'Barki — przedni akton', side: 'przod' },
  { id: 'barki-bok', label: 'Barki — boczny akton', side: 'przod' },
  { id: 'barki-tyl', label: 'Barki — tylny akton', side: 'tyl' },
  { id: 'biceps', label: 'Biceps', side: 'przod' },
  { id: 'triceps', label: 'Triceps', side: 'tyl' },
  { id: 'przedramiona', label: 'Przedramiona', side: 'przod' },
  { id: 'brzuch', label: 'Brzuch', side: 'przod' },
  { id: 'skosne', label: 'Mięśnie skośne', side: 'przod' },
  { id: 'kaptury', label: 'Kaptury (czworoboczny)', side: 'tyl' },
  { id: 'najszersze', label: 'Najszersze grzbietu', side: 'tyl' },
  { id: 'prostowniki', label: 'Prostowniki grzbietu', side: 'tyl' },
  { id: 'posladki', label: 'Pośladki', side: 'tyl' },
  { id: 'czworoglowe', label: 'Czworogłowe uda', side: 'przod' },
  { id: 'dwuglowe', label: 'Dwugłowe uda', side: 'tyl' },
  { id: 'przywodziciele', label: 'Przywodziciele', side: 'przod' },
  { id: 'lydki', label: 'Łydki', side: 'tyl' },
]

export const muscleById = (id: MuscleId) => MUSCLE_LIST.find((m) => m.id === id)!
export const muscleIndex = (id: MuscleId) => MUSCLE_LIST.findIndex((m) => m.id === id) + 1
export const muscleAt = (n: number): Muscle | undefined => MUSCLE_LIST[n - 1]

/** [główne, pomocnicze] */
export type Targets = [primary: MuscleId[], secondary: MuscleId[]]

/** Wbudowane ćwiczenia: które mięśnie pracują głównie, a które pomocniczo. */
export const EXERCISE_MUSCLES: Record<string, Targets> = {
  // Klatka
  'Wyciskanie sztangi na ławce płaskiej': [['klatka'], ['barki-przod', 'triceps']],
  'Wyciskanie sztangi na ławce skośnej': [['klatka'], ['barki-przod', 'triceps']],
  'Wyciskanie sztangi na ławce skośnej w dół': [['klatka'], ['triceps']],
  'Wyciskanie hantli na ławce płaskiej': [['klatka'], ['barki-przod', 'triceps']],
  'Wyciskanie hantli na ławce skośnej': [['klatka'], ['barki-przod', 'triceps']],
  'Rozpiętki z hantlami na ławce płaskiej': [['klatka'], ['barki-przod']],
  'Rozpiętki na wyciągu (bramie)': [['klatka'], ['barki-przod']],
  'Rozpiętki na maszynie (butterfly)': [['klatka'], ['barki-przod']],
  'Wyciskanie na maszynie siedząc': [['klatka'], ['barki-przod', 'triceps']],
  'Wyciskanie na suwnicy Smitha': [['klatka'], ['barki-przod', 'triceps']],
  Pompki: [['klatka'], ['triceps', 'barki-przod', 'brzuch']],
  'Pompki na poręczach (dipy)': [['klatka'], ['triceps', 'barki-przod']],
  'Przenoszenie hantla za głowę': [['klatka', 'najszersze'], ['triceps']],

  // Plecy
  'Podciąganie nachwytem': [['najszersze'], ['biceps', 'barki-tyl', 'przedramiona']],
  'Podciąganie podchwytem': [['najszersze', 'biceps'], ['przedramiona']],
  'Ściąganie drążka wyciągu do klatki': [['najszersze'], ['biceps', 'barki-tyl']],
  'Ściąganie drążka wyciągu wąsko (V-grip)': [['najszersze'], ['biceps']],
  'Wiosłowanie sztangą w opadzie': [['najszersze', 'kaptury'], ['barki-tyl', 'biceps', 'prostowniki']],
  'Wiosłowanie hantlą': [['najszersze'], ['kaptury', 'barki-tyl', 'biceps']],
  'Wiosłowanie na wyciągu dolnym siedząc': [['najszersze', 'kaptury'], ['barki-tyl', 'biceps']],
  'Wiosłowanie na maszynie': [['najszersze', 'kaptury'], ['barki-tyl', 'biceps']],
  'Wiosłowanie T-bar': [['najszersze', 'kaptury'], ['barki-tyl', 'biceps', 'prostowniki']],
  'Martwy ciąg klasyczny': [['prostowniki', 'posladki', 'dwuglowe'], ['czworoglowe', 'kaptury', 'najszersze', 'przedramiona']],
  'Przyciąganie liny do twarzy (face pull)': [['barki-tyl'], ['kaptury']],
  'Prostowanie ramion na wyciągu (pullover)': [['najszersze'], ['triceps']],
  'Szrugsy ze sztangą': [['kaptury'], ['przedramiona']],
  'Szrugsy z hantlami': [['kaptury'], ['przedramiona']],
  'Wyprosty tułowia na ławce rzymskiej': [['prostowniki'], ['posladki', 'dwuglowe']],

  // Nogi
  'Przysiad ze sztangą': [['czworoglowe', 'posladki'], ['przywodziciele', 'prostowniki', 'dwuglowe']],
  'Przysiad przedni': [['czworoglowe'], ['posladki', 'brzuch', 'prostowniki']],
  'Przysiad goblet': [['czworoglowe', 'posladki'], ['brzuch']],
  'Przysiad bułgarski': [['czworoglowe', 'posladki'], ['przywodziciele', 'dwuglowe']],
  'Przysiad na suwnicy Smitha': [['czworoglowe'], ['posladki']],
  'Hack przysiad (maszyna)': [['czworoglowe'], ['posladki']],
  'Wypychanie na suwnicy (prasa)': [['czworoglowe', 'posladki'], ['przywodziciele']],
  'Wykroki z hantlami': [['czworoglowe', 'posladki'], ['dwuglowe', 'przywodziciele']],
  'Wykroki ze sztangą': [['czworoglowe', 'posladki'], ['dwuglowe', 'przywodziciele']],
  'Wejścia na skrzynię': [['czworoglowe', 'posladki'], ['dwuglowe']],
  'Martwy ciąg rumuński': [['dwuglowe', 'posladki'], ['prostowniki', 'przedramiona']],
  'Martwy ciąg rumuński z hantlami': [['dwuglowe', 'posladki'], ['prostowniki', 'przedramiona']],
  'Martwy ciąg na prostych nogach': [['dwuglowe', 'posladki'], ['prostowniki']],
  'Hip thrust ze sztangą': [['posladki'], ['dwuglowe']],
  'Hip thrust na maszynie': [['posladki'], ['dwuglowe']],
  'Prostowanie nóg na maszynie': [['czworoglowe'], []],
  'Uginanie nóg na maszynie leżąc': [['dwuglowe'], ['lydki']],
  'Uginanie nóg na maszynie siedząc': [['dwuglowe'], []],
  'Odwodzenie nóg na maszynie': [['posladki'], []],
  'Przywodzenie nóg na maszynie': [['przywodziciele'], []],
  'Wspięcia na palce stojąc': [['lydki'], []],
  'Wspięcia na palce siedząc': [['lydki'], []],
  'Wspięcia na palce na suwnicy': [['lydki'], []],

  // Barki
  'Wyciskanie żołnierskie (OHP)': [['barki-przod', 'barki-bok'], ['triceps', 'kaptury', 'brzuch']],
  'Wyciskanie hantli nad głowę siedząc': [['barki-przod', 'barki-bok'], ['triceps']],
  'Wyciskanie Arnolda (arnoldki)': [['barki-przod', 'barki-bok'], ['triceps']],
  'Wyciskanie nad głowę na maszynie': [['barki-przod', 'barki-bok'], ['triceps']],
  'Unoszenie hantli bokiem': [['barki-bok'], ['kaptury']],
  'Unoszenie ramion bokiem na wyciągu': [['barki-bok'], ['kaptury']],
  'Unoszenie ramion bokiem na maszynie': [['barki-bok'], ['kaptury']],
  'Unoszenie hantli w przód': [['barki-przod'], []],
  'Unoszenie hantli w opadzie (tylny akton)': [['barki-tyl'], ['kaptury']],
  'Odwrotne rozpiętki na maszynie': [['barki-tyl'], ['kaptury']],
  'Podciąganie sztangi wzdłuż tułowia': [['barki-bok', 'kaptury'], ['biceps']],

  // Ramiona
  'Uginanie ramion ze sztangą': [['biceps'], ['przedramiona']],
  'Uginanie ramion ze sztangą łamaną': [['biceps'], ['przedramiona']],
  'Uginanie ramion z hantlami': [['biceps'], ['przedramiona']],
  'Uginanie ramion z hantlami chwytem młotkowym': [['biceps', 'przedramiona'], []],
  'Uginanie ramion na modlitewniku': [['biceps'], ['przedramiona']],
  'Uginanie ramion na wyciągu': [['biceps'], ['przedramiona']],
  'Uginanie ramion na ławce skośnej': [['biceps'], ['przedramiona']],
  'Uginanie koncentryczne': [['biceps'], []],
  'Prostowanie ramion na wyciągu (prosty drążek)': [['triceps'], []],
  'Prostowanie ramion na wyciągu (linka)': [['triceps'], []],
  'Prostowanie ramion nad głową na wyciągu': [['triceps'], []],
  'Wyciskanie francuskie sztangi leżąc': [['triceps'], []],
  'Wyciskanie francuskie hantla nad głową': [['triceps'], []],
  'Wyciskanie sztangi wąsko': [['triceps'], ['klatka', 'barki-przod']],
  'Pompki na poręczach (triceps)': [['triceps'], ['klatka', 'barki-przod']],
  'Prostowanie ramienia z hantlem w opadzie': [['triceps'], []],
  'Uginanie nadgarstków': [['przedramiona'], []],

  // Brzuch
  'Allahy (spięcia na wyciągu)': [['brzuch'], ['skosne']],
  'Unoszenie nóg w zwisie': [['brzuch'], ['skosne', 'przedramiona']],
  'Unoszenie kolan w podporze': [['brzuch'], ['skosne']],
  'Spięcia brzucha (brzuszki)': [['brzuch'], ['skosne']],
  'Spięcia brzucha na maszynie': [['brzuch'], ['skosne']],
  'Deska (plank)': [['brzuch'], ['skosne', 'barki-przod']],
  'Russian twist': [['skosne'], ['brzuch']],
  'Kółko do brzucha (ab wheel)': [['brzuch'], ['skosne', 'najszersze']],
  'Pallof press': [['skosne'], ['brzuch']],

  // Inne
  'Spacer farmera': [['przedramiona', 'kaptury'], ['brzuch', 'skosne']],
  'Wymachy kettlebell': [['posladki', 'dwuglowe'], ['prostowniki', 'barki-przod']],
  'Power clean': [['posladki', 'czworoglowe', 'kaptury'], ['dwuglowe', 'prostowniki', 'barki-bok']],
  'Rowerek stacjonarny': [['czworoglowe'], ['posladki', 'lydki']],
  'Wioślarz (ergometr)': [['najszersze', 'czworoglowe'], ['biceps', 'dwuglowe', 'prostowniki']],
  Bieżnia: [['czworoglowe', 'lydki'], ['dwuglowe', 'posladki']],
  Orbitrek: [['czworoglowe', 'posladki'], ['lydki']],
  Skakanka: [['lydki'], ['czworoglowe']],
}

/**
 * Własne ćwiczenia (i importowane z GymRun): mięśnie zgadujemy po słowach w nazwie.
 * Kolejność ma znaczenie — pierwsza pasująca reguła wygrywa. Nazwy porównujemy bez polskich znaków.
 */
export const NAME_RULES: [RegExp, Targets][] = [
  [/wspiec|lydk|lydek/, [['lydki'], []]],
  [/uginanie nog|dwuglow/, [['dwuglowe'], []]],
  [/prostowanie nog|czworoglow/, [['czworoglowe'], []]],
  [/rumunsk|prostych nogach/, [['dwuglowe', 'posladki'], ['prostowniki']]],
  [/hip thrust|posladk|odwodz|unoszenie bioder/, [['posladki'], ['dwuglowe']]],
  [/przywodz/, [['przywodziciele'], []]],
  [/przysiad|wykrok|suwnic.*nog|prasa/, [['czworoglowe', 'posladki'], ['dwuglowe']]],
  [/martwy/, [['prostowniki', 'posladki', 'dwuglowe'], ['kaptury', 'przedramiona']]],
  [/szrug|kaptur/, [['kaptury'], []]],
  [/face pull|tylny akton|odwrotne rozpietki|w opadzie.*unoszenie|unoszenie.*w opadzie/, [['barki-tyl'], ['kaptury']]],
  [/bokiem/, [['barki-bok'], ['kaptury']]],
  [/w przod/, [['barki-przod'], []]],
  [/nadgarst|przedrami/, [['przedramiona'], []]],
  [/mlotk/, [['biceps', 'przedramiona'], []]],
  [/francusk|prostowanie ram|triceps|kickback/, [['triceps'], []]],
  [/uginanie ram|biceps|curl/, [['biceps'], ['przedramiona']]],
  [/skosn|russian|pallof|wiatrak/, [['skosne'], ['brzuch']]],
  [/nad glowe|zolniersk|arnold/, [['barki-przod', 'barki-bok'], ['triceps']]],
  [/wioslowanie|sciaganie|podciaganie/, [['najszersze'], ['biceps', 'barki-tyl']]],
  [/wyciskanie|rozpietki|pompki/, [['klatka'], ['barki-przod', 'triceps']]],
]

/** Gdy żadna reguła nie pasuje — według partii z bazy ćwiczeń. */
export const GROUP_DEFAULT: Record<MuscleGroup, Targets> = {
  klatka: [['klatka'], []],
  plecy: [['najszersze'], []],
  nogi: [['czworoglowe'], []],
  barki: [['barki-przod', 'barki-bok'], []],
  ramiona: [['biceps', 'triceps'], []],
  brzuch: [['brzuch'], []],
  inne: [[], []],
}
