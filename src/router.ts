import { useEffect, useState } from 'react'

/**
 * Prosty router na fragmencie adresu (#/plany, #/trening/12 …).
 * Każdy ekran ma własny wpis w historii, więc systemowy przycisk Wstecz w Androidzie działa naturalnie.
 */
export type Route =
  | { name: 'start' }
  | { name: 'plany' }
  | { name: 'plan'; id: number }
  | { name: 'dzien'; id: number }
  | { name: 'historia' }
  | { name: 'cwiczenia' }
  | { name: 'cwiczenie'; id: number }
  | { name: 'trening'; id: number }
  | { name: 'podsumowanie'; id: number }
  | { name: 'sesja'; id: number }
  | { name: 'ustawienia' }
  /** Skrót z ikony aplikacji: wznawia trwający trening albo zaczyna następny dzień planu. */
  | { name: 'szybki-start' }

export function parse(hash: string): Route {
  const [a, b] = hash.replace(/^#\/?/, '').split('/')
  const id = Number(b)
  switch (a) {
    case 'plany':
    case 'historia':
    case 'cwiczenia':
    case 'ustawienia':
    case 'szybki-start':
      return { name: a }
    case 'plan':
    case 'dzien':
    case 'cwiczenie':
    case 'trening':
    case 'podsumowanie':
    case 'sesja':
      return Number.isFinite(id) && id > 0 ? { name: a, id } : { name: 'start' }
    default:
      return { name: 'start' }
  }
}

export function href(r: Route) {
  return 'id' in r ? `#/${r.name}/${r.id}` : `#/${r.name}`
}

/** Wpisy historii dodane przez aplikację są oznaczone, żeby „Wstecz” nie wyszło z aplikacji. */
export function navigate(r: Route, replace = false) {
  const h = href(r)
  if (replace) history.replaceState(history.state, '', h)
  else history.pushState({ gl: true }, '', h)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

/** Wstecz w aplikacji; gdy nie ma dokąd wrócić (np. po otwarciu z ikony) — do podanego ekranu. */
export function back(fallback: Route = { name: 'start' }) {
  if (history.state?.gl) history.back()
  else navigate(fallback, true)
}

export function useRoute() {
  const [route, setRoute] = useState(() => parse(window.location.hash))
  useEffect(() => {
    const on = () => setRoute(parse(window.location.hash))
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}
