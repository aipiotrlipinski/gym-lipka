import { useSyncExternalStore } from 'react'

/**
 * Drobne ustawienia zapisywane w telefonie (localStorage): imię, zwinięte sekcje.
 * Każda zmiana odświeża wszystkie ekrany, które z niej korzystają.
 */

const listeners = new Set<() => void>()
const cache = new Map<string, string | null>()

function read(key: string): string | null {
  if (cache.has(key)) return cache.get(key)!
  let v: string | null = null
  try {
    v = localStorage.getItem(key)
  } catch {
    /* brak dostępu do pamięci — wartość tylko do zamknięcia aplikacji */
  }
  cache.set(key, v)
  return v
}

export function setPref(key: string, value: string | null) {
  cache.set(key, value)
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* ignorujemy — wartość zostaje w pamięci do zamknięcia aplikacji */
  }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function usePref(key: string): string | null {
  return useSyncExternalStore(subscribe, () => read(key))
}

export const NAME_KEY = 'silka-name'

/** Imię użytkownika; null = jeszcze nie podane (pierwsze uruchomienie). */
export function useName() {
  return usePref(NAME_KEY)
}

export function saveName(name: string) {
  setPref(NAME_KEY, name.trim())
}

/** Zwinięta sekcja (np. w Historii). Domyślnie rozwinięta. */
export function useCollapsed(id: string): [boolean, () => void] {
  const key = `silka-zwiniete-${id}`
  const v = usePref(key) === '1'
  return [v, () => setPref(key, v ? null : '1')]
}
