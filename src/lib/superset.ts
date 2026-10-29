import type { WorkoutSet } from '../db'

/**
 * Superserie: ćwiczenie z `superset: true` jest połączone z następnym na liście.
 * Kilka połączonych pod rząd tworzy jedną grupę (superseria, trójseria…).
 * Czysta logika — bez bazy, testowalna.
 */

export interface Linkable {
  exerciseId: number
  superset?: boolean
}

/** Czy ćwiczenie `i` jest połączone z następnym (ostatnie na liście nigdy nie jest). */
export function linkedWithNext(items: Linkable[], i: number) {
  return !!items[i]?.superset && i + 1 < items.length
}

/** Zakres [od, do] grupy superserii, do której należy ćwiczenie `i` (dla zwykłego ćwiczenia: [i, i]). */
export function groupOf(items: Linkable[], i: number): [number, number] {
  let a = i
  while (a > 0 && linkedWithNext(items, a - 1)) a--
  let b = i
  while (linkedWithNext(items, b)) b++
  return [a, b]
}

/** Litera ćwiczenia w superserii (A1, A2… dla pierwszej grupy, B1… dla drugiej) albo null. */
export function supersetLabel(items: Linkable[], i: number): string | null {
  const [a, b] = groupOf(items, i)
  if (a === b) return null
  let n = 0
  for (let k = 0; k < a; ) {
    const [, e] = groupOf(items, k)
    if (e > k) n++
    k = e + 1
  }
  return `${String.fromCharCode(65 + (n % 26))}${i - a + 1}`
}

export interface AfterSet {
  /** Indeks ćwiczenia, na które przejść (null = zostań). */
  goTo: number | null
  /** Czy włączyć przerwę. */
  rest: boolean
}

/**
 * Co po zaliczeniu serii w ćwiczeniu `i` (serie już z tą zaliczoną).
 * - Zwykłe ćwiczenie: przerwa, gdy jeszcze coś zostało; po ostatniej serii — następne niedokończone.
 * - Superseria: przejście do następnego ćwiczenia z grupy bez przerwy; przerwa dopiero po całej rundzie.
 */
export function afterSet(items: Linkable[], sets: Pick<WorkoutSet, 'exerciseId' | 'done'>[], i: number): AfterSet {
  const hasUndone = (k: number) => sets.some((s) => s.exerciseId === items[k]?.exerciseId && !s.done)
  const anyLeft = items.some((_, k) => hasUndone(k))
  const [a, b] = groupOf(items, i)

  if (a < b) {
    // Następne w rundzie (po kolei, z zawinięciem do początku grupy).
    const order = [...Array(b - i).keys()].map((k) => i + 1 + k).concat([...Array(i - a + 1).keys()].map((k) => a + k))
    const c = order.find(hasUndone)
    if (c !== undefined) return c > i ? { goTo: c, rest: false } : { goTo: c, rest: true }
    // Grupa skończona — dalej jak po zwykłym ćwiczeniu.
    const nxt = items.findIndex((_, k) => k > b && hasUndone(k))
    return { goTo: nxt >= 0 ? nxt : null, rest: anyLeft }
  }

  if (hasUndone(i)) return { goTo: null, rest: true }
  const nxt = items.findIndex((_, k) => k > i && hasUndone(k))
  return { goTo: nxt >= 0 ? nxt : null, rest: anyLeft || i + 1 < items.length }
}

/** Usuwa ćwiczenia z listy, nie psując superserii (link przechodzi tylko, gdy obie strony były połączone). */
export function removeAt<T extends Linkable>(items: T[], remove: (it: T, i: number) => boolean): T[] {
  const out: T[] = []
  for (const [i, it] of items.entries()) {
    if (remove(it, i)) {
      const prev = out[out.length - 1]
      if (prev?.superset && !(i > 0 && linkedWithNext(items, i))) out[out.length - 1] = { ...prev, superset: undefined }
      continue
    }
    out.push(it)
  }
  if (out.length && out[out.length - 1].superset) out[out.length - 1] = { ...out[out.length - 1], superset: undefined }
  return out
}

/** Zamiana miejscami ćwiczeń `i` i `j` — superserie wokół przesuwanych ćwiczeń są rozłączane. */
export function swapAt<T extends Linkable>(items: T[], i: number, j: number): T[] {
  const list = [...items]
  ;[list[i], list[j]] = [list[j], list[i]]
  const lo = Math.max(0, Math.min(i, j) - 1)
  const hi = Math.max(i, j)
  return list.map((it, k) => (k >= lo && k <= hi && it.superset ? { ...it, superset: undefined } : it))
}
