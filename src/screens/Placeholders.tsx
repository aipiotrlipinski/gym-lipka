import { ComingSoon, ScreenTitle } from '../components/ui'

export function Plany() {
  return (
    <div className="pb-6">
      <ScreenTitle>Plany</ScreenTitle>
      <ComingSoon stage="Etap 1" title="Edytor planów">
        Tu stworzysz plan Góra / Dół na 4 dni: ćwiczenia, liczbę serii, zakres powtórzeń i czas przerwy. Kolejność
        zmienisz przeciąganiem.
      </ComingSoon>
    </div>
  )
}

export function Historia() {
  return (
    <div className="pb-6">
      <ScreenTitle>Historia</ScreenTitle>
      <ComingSoon stage="Etap 3" title="Kalendarz i postępy">
        Tu zobaczysz kalendarz treningów, listę sesji, wykresy postępu każdego ćwiczenia i rekordy.
      </ComingSoon>
    </div>
  )
}

export function Cwiczenia() {
  return (
    <div className="pb-6">
      <ScreenTitle>Ćwiczenia</ScreenTitle>
      <ComingSoon stage="Etap 1" title="Baza ćwiczeń">
        Tu będzie ok. 100 ćwiczeń po polsku z wyszukiwarką i filtrem po partiach mięśni, a także Twoje własne
        ćwiczenia.
      </ComingSoon>
    </div>
  )
}
