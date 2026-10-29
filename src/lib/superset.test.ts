import { describe, expect, it } from 'vitest'
import { afterSet, groupOf, removeAt, supersetLabel, swapAt } from './superset'

// A, B w superserii; C osobno; D, E, F w trójserii.
const items = [
  { exerciseId: 1, superset: true },
  { exerciseId: 2 },
  { exerciseId: 3 },
  { exerciseId: 4, superset: true },
  { exerciseId: 5, superset: true },
  { exerciseId: 6 },
]
const sets = (undone: Record<number, number>) =>
  items.flatMap((it) => [...Array(3).keys()].map((k) => ({ exerciseId: it.exerciseId, done: k >= (undone[it.exerciseId] ?? 0) ? true : false })))

describe('superserie', () => {
  it('wyznacza grupy i etykiety', () => {
    expect(groupOf(items, 0)).toEqual([0, 1])
    expect(groupOf(items, 1)).toEqual([0, 1])
    expect(groupOf(items, 2)).toEqual([2, 2])
    expect(groupOf(items, 5)).toEqual([3, 5])
    expect(supersetLabel(items, 0)).toBe('A1')
    expect(supersetLabel(items, 1)).toBe('A2')
    expect(supersetLabel(items, 2)).toBeNull()
    expect(supersetLabel(items, 4)).toBe('B2')
  })

  it('ostatnie ćwiczenie nie łączy się z niczym', () => {
    expect(groupOf([{ exerciseId: 1, superset: true }], 0)).toEqual([0, 0])
  })

  it('w rundzie przechodzi dalej bez przerwy, po rundzie — przerwa i powrót na początek', () => {
    // Po serii A (zostały 2 serie A i 3 serie B) → B bez przerwy.
    expect(afterSet(items, sets({ 1: 2, 2: 3, 3: 3 }), 0)).toEqual({ goTo: 1, rest: false })
    // Po serii B → przerwa i z powrotem A.
    expect(afterSet(items, sets({ 1: 2, 2: 2, 3: 3 }), 1)).toEqual({ goTo: 0, rest: true })
    // A skończone, B ma jeszcze serię → B, z przerwą (nowa runda).
    expect(afterSet(items, sets({ 1: 0, 2: 1, 3: 3 }), 1)).toEqual({ goTo: 1, rest: true })
    // Cała superseria skończona → C, z przerwą.
    expect(afterSet(items, sets({ 3: 3 }), 1)).toEqual({ goTo: 2, rest: true })
  })

  it('trójseria idzie D → E → F → przerwa → D', () => {
    expect(afterSet(items, sets({ 4: 2, 5: 3, 6: 3 }), 3)).toEqual({ goTo: 4, rest: false })
    expect(afterSet(items, sets({ 4: 2, 5: 2, 6: 3 }), 4)).toEqual({ goTo: 5, rest: false })
    expect(afterSet(items, sets({ 4: 2, 5: 2, 6: 2 }), 5)).toEqual({ goTo: 3, rest: true })
    // Ostatnia seria całego treningu → bez przerwy.
    expect(afterSet(items, sets({}), 5)).toEqual({ goTo: null, rest: false })
  })

  it('zwykłe ćwiczenie działa jak dotąd', () => {
    expect(afterSet(items, sets({ 3: 2 }), 2)).toEqual({ goTo: null, rest: true })
    expect(afterSet(items, sets({ 4: 3 }), 2)).toEqual({ goTo: 3, rest: true })
  })

  it('usuwanie i przesuwanie nie zostawia błędnych połączeń', () => {
    expect(removeAt(items, (_, i) => i === 1).map((x) => !!x.superset)).toEqual([false, false, true, true, false])
    expect(removeAt(items, (_, i) => i === 4).map((x) => !!x.superset)).toEqual([true, false, false, true, false])
    expect(removeAt(items, (_, i) => i === 5).map((x) => !!x.superset)).toEqual([true, false, false, true, false])
    expect(swapAt(items, 2, 3).map((x) => [x.exerciseId, !!x.superset])).toEqual([
      [1, true], [2, false], [4, false], [3, false], [5, true], [6, false],
    ])
  })
})
