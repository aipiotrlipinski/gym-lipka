import type { Equipment, MuscleGroup } from '../db'

/** Wbudowana baza ćwiczeń. Nazwy są unikalne — plan startowy odwołuje się do nich po nazwie. */
type Row = [name: string, muscle: MuscleGroup, equipment: Equipment]

export const BUILTIN_EXERCISES: Row[] = [
  // Klatka
  ['Wyciskanie sztangi na ławce płaskiej', 'klatka', 'sztanga'],
  ['Wyciskanie sztangi na ławce skośnej', 'klatka', 'sztanga'],
  ['Wyciskanie sztangi na ławce skośnej w dół', 'klatka', 'sztanga'],
  ['Wyciskanie hantli na ławce płaskiej', 'klatka', 'hantle'],
  ['Wyciskanie hantli na ławce skośnej', 'klatka', 'hantle'],
  ['Rozpiętki z hantlami na ławce płaskiej', 'klatka', 'hantle'],
  ['Rozpiętki na wyciągu (bramie)', 'klatka', 'wyciąg'],
  ['Rozpiętki na maszynie (butterfly)', 'klatka', 'maszyna'],
  ['Wyciskanie na maszynie siedząc', 'klatka', 'maszyna'],
  ['Wyciskanie na suwnicy Smitha', 'klatka', 'maszyna'],
  ['Pompki', 'klatka', 'masa ciała'],
  ['Pompki na poręczach (dipy)', 'klatka', 'masa ciała'],
  ['Przenoszenie hantla za głowę', 'klatka', 'hantle'],

  // Plecy
  ['Podciąganie nachwytem', 'plecy', 'masa ciała'],
  ['Podciąganie podchwytem', 'plecy', 'masa ciała'],
  ['Ściąganie drążka wyciągu do klatki', 'plecy', 'wyciąg'],
  ['Ściąganie drążka wyciągu wąsko (V-grip)', 'plecy', 'wyciąg'],
  ['Wiosłowanie sztangą w opadzie', 'plecy', 'sztanga'],
  ['Wiosłowanie hantlą', 'plecy', 'hantle'],
  ['Wiosłowanie na wyciągu dolnym siedząc', 'plecy', 'wyciąg'],
  ['Wiosłowanie na maszynie', 'plecy', 'maszyna'],
  ['Wiosłowanie T-bar', 'plecy', 'sztanga'],
  ['Martwy ciąg klasyczny', 'plecy', 'sztanga'],
  ['Przyciąganie liny do twarzy (face pull)', 'plecy', 'wyciąg'],
  ['Prostowanie ramion na wyciągu (pullover)', 'plecy', 'wyciąg'],
  ['Szrugsy ze sztangą', 'plecy', 'sztanga'],
  ['Szrugsy z hantlami', 'plecy', 'hantle'],
  ['Wyprosty tułowia na ławce rzymskiej', 'plecy', 'masa ciała'],

  // Nogi
  ['Przysiad ze sztangą', 'nogi', 'sztanga'],
  ['Przysiad przedni', 'nogi', 'sztanga'],
  ['Przysiad goblet', 'nogi', 'hantle'],
  ['Przysiad bułgarski', 'nogi', 'hantle'],
  ['Przysiad na suwnicy Smitha', 'nogi', 'maszyna'],
  ['Hack przysiad (maszyna)', 'nogi', 'maszyna'],
  ['Wypychanie na suwnicy (prasa)', 'nogi', 'maszyna'],
  ['Wykroki z hantlami', 'nogi', 'hantle'],
  ['Wykroki ze sztangą', 'nogi', 'sztanga'],
  ['Wejścia na skrzynię', 'nogi', 'hantle'],
  ['Martwy ciąg rumuński', 'nogi', 'sztanga'],
  ['Martwy ciąg rumuński z hantlami', 'nogi', 'hantle'],
  ['Martwy ciąg na prostych nogach', 'nogi', 'sztanga'],
  ['Hip thrust ze sztangą', 'nogi', 'sztanga'],
  ['Hip thrust na maszynie', 'nogi', 'maszyna'],
  ['Prostowanie nóg na maszynie', 'nogi', 'maszyna'],
  ['Uginanie nóg na maszynie leżąc', 'nogi', 'maszyna'],
  ['Uginanie nóg na maszynie siedząc', 'nogi', 'maszyna'],
  ['Odwodzenie nóg na maszynie', 'nogi', 'maszyna'],
  ['Przywodzenie nóg na maszynie', 'nogi', 'maszyna'],
  ['Wspięcia na palce stojąc', 'nogi', 'maszyna'],
  ['Wspięcia na palce siedząc', 'nogi', 'maszyna'],
  ['Wspięcia na palce na suwnicy', 'nogi', 'maszyna'],

  // Barki
  ['Wyciskanie żołnierskie (OHP)', 'barki', 'sztanga'],
  ['Wyciskanie hantli nad głowę siedząc', 'barki', 'hantle'],
  ['Wyciskanie Arnolda (arnoldki)', 'barki', 'hantle'],
  ['Wyciskanie nad głowę na maszynie', 'barki', 'maszyna'],
  ['Unoszenie hantli bokiem', 'barki', 'hantle'],
  ['Unoszenie ramion bokiem na wyciągu', 'barki', 'wyciąg'],
  ['Unoszenie ramion bokiem na maszynie', 'barki', 'maszyna'],
  ['Unoszenie hantli w przód', 'barki', 'hantle'],
  ['Unoszenie hantli w opadzie (tylny akton)', 'barki', 'hantle'],
  ['Odwrotne rozpiętki na maszynie', 'barki', 'maszyna'],
  ['Podciąganie sztangi wzdłuż tułowia', 'barki', 'sztanga'],

  // Ramiona
  ['Uginanie ramion ze sztangą', 'ramiona', 'sztanga'],
  ['Uginanie ramion ze sztangą łamaną', 'ramiona', 'sztanga'],
  ['Uginanie ramion z hantlami', 'ramiona', 'hantle'],
  ['Uginanie ramion z hantlami chwytem młotkowym', 'ramiona', 'hantle'],
  ['Uginanie ramion na modlitewniku', 'ramiona', 'sztanga'],
  ['Uginanie ramion na wyciągu', 'ramiona', 'wyciąg'],
  ['Uginanie ramion na ławce skośnej', 'ramiona', 'hantle'],
  ['Uginanie koncentryczne', 'ramiona', 'hantle'],
  ['Prostowanie ramion na wyciągu (prosty drążek)', 'ramiona', 'wyciąg'],
  ['Prostowanie ramion na wyciągu (linka)', 'ramiona', 'wyciąg'],
  ['Prostowanie ramion nad głową na wyciągu', 'ramiona', 'wyciąg'],
  ['Wyciskanie francuskie sztangi leżąc', 'ramiona', 'sztanga'],
  ['Wyciskanie francuskie hantla nad głową', 'ramiona', 'hantle'],
  ['Wyciskanie sztangi wąsko', 'ramiona', 'sztanga'],
  ['Pompki na poręczach (triceps)', 'ramiona', 'masa ciała'],
  ['Prostowanie ramienia z hantlem w opadzie', 'ramiona', 'hantle'],
  ['Uginanie nadgarstków', 'ramiona', 'sztanga'],

  // Brzuch
  ['Allahy (spięcia na wyciągu)', 'brzuch', 'wyciąg'],
  ['Unoszenie nóg w zwisie', 'brzuch', 'masa ciała'],
  ['Unoszenie kolan w podporze', 'brzuch', 'masa ciała'],
  ['Spięcia brzucha (brzuszki)', 'brzuch', 'masa ciała'],
  ['Spięcia brzucha na maszynie', 'brzuch', 'maszyna'],
  ['Deska (plank)', 'brzuch', 'masa ciała'],
  ['Russian twist', 'brzuch', 'masa ciała'],
  ['Kółko do brzucha (ab wheel)', 'brzuch', 'inne'],
  ['Pallof press', 'brzuch', 'wyciąg'],

  // Inne
  ['Spacer farmera', 'inne', 'hantle'],
  ['Wymachy kettlebell', 'inne', 'inne'],
  ['Power clean', 'inne', 'sztanga'],
  ['Rowerek stacjonarny', 'inne', 'maszyna'],
  ['Wioślarz (ergometr)', 'inne', 'maszyna'],
  ['Bieżnia', 'inne', 'maszyna'],
  ['Orbitrek', 'inne', 'maszyna'],
  ['Skakanka', 'inne', 'inne'],
]

/** Plan startowy zgodny z rotacją Piotra: Góra/Dół, 4 dni. Do edycji w aplikacji. */
type DayRow = [exercise: string, sets: number, repsMin: number, repsMax: number, restSec: number]

export const STARTER_PLAN: { name: string; days: { name: string; exercises: DayRow[] }[] } = {
  name: 'Góra / Dół',
  days: [
    {
      name: 'Góra A',
      exercises: [
        ['Wyciskanie sztangi na ławce płaskiej', 4, 6, 8, 150],
        ['Wiosłowanie sztangą w opadzie', 4, 6, 8, 150],
        ['Wyciskanie żołnierskie (OHP)', 3, 6, 10, 120],
        ['Ściąganie drążka wyciągu do klatki', 3, 8, 12, 90],
        ['Uginanie ramion ze sztangą', 3, 8, 12, 60],
        ['Prostowanie ramion na wyciągu (linka)', 3, 10, 15, 60],
      ],
    },
    {
      name: 'Dół A',
      exercises: [
        ['Przysiad ze sztangą', 4, 5, 8, 180],
        ['Martwy ciąg rumuński', 3, 8, 10, 120],
        ['Wykroki z hantlami', 3, 10, 12, 90],
        ['Uginanie nóg na maszynie leżąc', 3, 10, 15, 60],
        ['Wspięcia na palce stojąc', 4, 10, 15, 60],
        ['Allahy (spięcia na wyciągu)', 3, 12, 15, 60],
      ],
    },
    {
      name: 'Góra B',
      exercises: [
        ['Wyciskanie hantli na ławce skośnej', 4, 8, 10, 120],
        ['Podciąganie nachwytem', 4, 6, 10, 120],
        ['Wyciskanie hantli nad głowę siedząc', 3, 8, 12, 90],
        ['Wiosłowanie hantlą', 3, 8, 12, 90],
        ['Unoszenie hantli bokiem', 3, 12, 15, 60],
        ['Uginanie ramion z hantlami chwytem młotkowym', 3, 10, 12, 60],
      ],
    },
    {
      name: 'Dół B',
      exercises: [
        ['Martwy ciąg klasyczny', 3, 4, 6, 180],
        ['Wypychanie na suwnicy (prasa)', 4, 8, 12, 120],
        ['Hip thrust ze sztangą', 3, 8, 12, 90],
        ['Prostowanie nóg na maszynie', 3, 12, 15, 60],
        ['Wspięcia na palce siedząc', 4, 12, 15, 60],
        ['Unoszenie nóg w zwisie', 3, 10, 15, 60],
      ],
    },
  ],
}
