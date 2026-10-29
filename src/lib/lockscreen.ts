import { registerPlugin } from '@capacitor/core'
import { liveQuery } from 'dexie'
import { db, type Measure, type Workout, type WorkoutSet } from '../db'
import { afterLockDone, pickCurrent, setText } from './lockscreenModel'
import { measureOf } from './measure'
import { isApk } from './native'
import { onRestChange, rest, restSnapshot } from './rest'
import { activeWorkout, setsOf } from './workout'

/**
 * Powiadomienie treningowe na ekranie blokady (tylko APK):
 * bieżące ćwiczenie, seria z ciężarem, odliczanie przerwy i przyciski
 * „Zaczynam serię” (kończy przerwę) / „Seria zrobiona” (zapisuje serię, włącza przerwę).
 */

interface LockState {
  title: string
  text: string
  restEndAt: number
  canStart: boolean
  canDone: boolean
  /** Serie bieżącego ćwiczenia: zrobione / wszystkie (do paska postępu w Now Bar). */
  setsDone: number
  setsTotal: number
}

interface GymWorkoutPlugin {
  show(s: LockState): Promise<void>
  hide(): Promise<void>
  status(): Promise<{ enabled: boolean; channelBlocked: boolean }>
  openSettings(): Promise<void>
  addListener(event: 'action', cb: (e: { type: 'start' | 'done' }) => void): Promise<{ remove: () => void }>
}

const GymWorkout = registerPlugin<GymWorkoutPlugin>('GymWorkout')

/** Ćwiczenie otwarte na ekranie treningu — ma pierwszeństwo, jeśli ma niezaliczone serie. */
let focusExerciseId: number | undefined
export function setFocusExercise(id: number | undefined) {
  if (focusExerciseId === id) return
  focusExerciseId = id
  void refreshLockScreen()
}

/** Zdarzenie dla ekranu treningu: seria zaliczona z ekranu blokady (żeby przejść do następnego ćwiczenia). */
export const SET_DONE_EVENT = 'gl-set-done'

export interface Current {
  workout: Workout
  set?: WorkoutSet
  exerciseName: string
  measure: Measure
  restSec: number
  /** Czy po tej serii jest jeszcze coś do zrobienia. */
  moreAfter: boolean
}

async function current(): Promise<Current | null> {
  const workout = await activeWorkout()
  if (!workout) return null
  const sets = await setsOf(workout.id)
  const { item, set, moreAfter } = pickCurrent(workout, sets, focusExerciseId)
  const ex = item ? await db.exercises.get(item.exerciseId) : undefined
  return { workout, set, exerciseName: ex?.name ?? '', measure: measureOf(ex), restSec: item?.restSec ?? 0, moreAfter }
}

let last = ''
export async function refreshLockScreen() {
  if (!isApk) return
  const cur = await current()
  if (!cur) {
    if (last !== 'hidden') {
      last = 'hidden'
      await GymWorkout.hide().catch(() => {})
    }
    return
  }
  const r = restSnapshot()
  const restEndAt = r && r.endAt > Date.now() ? r.endAt : 0
  const sets = await setsOf(cur.workout.id)
  const mine = cur.set ? sets.filter((x) => x.exerciseId === cur.set!.exerciseId) : []
  const progress = { setsDone: mine.filter((x) => x.done).length, setsTotal: mine.length }
  const state: LockState = cur.set
    ? { title: cur.exerciseName, text: setText(cur.set, sets, cur.measure), restEndAt, canStart: restEndAt > 0, canDone: true, ...progress }
    : { title: 'Wszystkie serie zrobione', text: 'Otwórz aplikację, żeby zakończyć trening', restEndAt: 0, canStart: false, canDone: false, setsDone: 0, setsTotal: 0 }
  const key = JSON.stringify(state)
  if (key === last) return
  last = key
  await GymWorkout.show(state).catch(() => {})
}

/** „Seria zrobiona” z ekranu blokady — to samo, co stuknięcie ✓ w aplikacji. */
async function completeFromLockScreen() {
  const cur = await current()
  if (!cur?.set) return
  const next = afterLockDone(cur.workout, await setsOf(cur.workout.id), cur.set.id)
  await db.sets.update(cur.set.id, { done: true })
  if (cur.restSec > 0 && next.rest) rest.start(cur.restSec, cur.exerciseName)
  else rest.stop()
  // Superseria: powiadomienie od razu pokazuje kolejne ćwiczenie z rundy.
  focusExerciseId = next.nextExerciseId
  window.dispatchEvent(
    new CustomEvent(SET_DONE_EVENT, { detail: { exerciseId: cur.set.exerciseId, nextExerciseId: next.nextExerciseId } }),
  )
  await refreshLockScreen()
}

let started = false
/** Start nasłuchu (raz, w APK): zmiany treningu i przerwy odświeżają powiadomienie. */
export function startLockScreen() {
  if (!isApk || started) return
  started = true
  GymWorkout.addListener('action', (e) => {
    if (e.type === 'done') void completeFromLockScreen()
    else {
      rest.stop()
      void refreshLockScreen()
    }
  })
  onRestChange(() => void refreshLockScreen())
  // Każda zmiana treningu, serii czy ćwiczeń (także w aplikacji) odświeża powiadomienie.
  liveQuery(async () => {
    const w = await activeWorkout()
    return w ? [w, await setsOf(w.id), await db.exercises.count()] : null
  }).subscribe(() => void refreshLockScreen())
  void refreshLockScreen()
}

/** Czy Android pozwala pokazać powiadomienie treningowe (null w przeglądarce). */
export async function lockScreenStatus(): Promise<{ enabled: boolean; channelBlocked: boolean } | null> {
  if (!isApk) return null
  return GymWorkout.status().catch(() => null)
}

export function openNotificationSettings() {
  if (isApk) void GymWorkout.openSettings().catch(() => {})
}
