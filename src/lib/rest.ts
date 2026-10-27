import { useEffect, useState, useSyncExternalStore } from 'react'
import { Capacitor } from '@capacitor/core'

/**
 * Timer przerwy. Trzymamy czas końca (a nie odliczanie), więc timer jest dokładny
 * także po zablokowaniu ekranu, przełączeniu aplikacji czy odświeżeniu.
 */
interface RestState {
  endAt: number
  total: number
  label: string
}

const KEY = 'gl-rest'
let state: RestState | null = load()
const listeners = new Set<() => void>()
let alarmTimer: number | undefined

function load(): RestState | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return v && v.endAt > Date.now() - 60_000 ? v : null
  } catch {
    return null
  }
}

function emit() {
  try {
    if (state) localStorage.setItem(KEY, JSON.stringify(state))
    else localStorage.removeItem(KEY)
  } catch {
    /* bez zapisu timer i tak działa do zamknięcia aplikacji */
  }
  scheduleAlarm()
  listeners.forEach((l) => l())
}

let audio: AudioContext | undefined
/** Włączamy dźwięk przy dotknięciu, bo przeglądarka pozwala grać dopiero po geście użytkownika. */
export function unlockAudio() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    /* brak dźwięku — zostaje wibracja */
  }
}

function beep() {
  try {
    if (!audio) return
    const t = audio.currentTime
    for (const [i, f] of [880, 880, 1175].entries()) {
      const o = audio.createOscillator()
      const g = audio.createGain()
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, t + i * 0.22)
      g.gain.exponentialRampToValueAtTime(0.35, t + i * 0.22 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.22 + 0.18)
      o.connect(g).connect(audio.destination)
      o.start(t + i * 0.22)
      o.stop(t + i * 0.22 + 0.2)
    }
  } catch {
    /* ignorujemy */
  }
}

function scheduleAlarm() {
  window.clearTimeout(alarmTimer)
  if (!state) return
  const left = state.endAt - Date.now()
  if (left <= 0) return
  alarmTimer = window.setTimeout(() => {
    // W APK przy zgaszonym ekranie sygnał daje powiadomienie treningowe — bez podwójnego alarmu.
    if (Capacitor.isNativePlatform() && document.visibilityState === 'hidden') return
    beep()
    navigator.vibrate?.([350, 150, 350])
  }, left)
}
scheduleAlarm()

export const rest = {
  start(seconds: number, label: string) {
    unlockAudio()
    state = { endAt: Date.now() + seconds * 1000, total: seconds, label }
    emit()
  },
  add(seconds: number) {
    if (!state) return
    const endAt = Math.max(Date.now(), state.endAt + seconds * 1000)
    state = { ...state, endAt, total: Math.max(1, state.total + seconds) }
    emit()
  },
  stop() {
    state = null
    emit()
  },
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Stan przerwy bez Reacta (dla powiadomienia na ekranie blokady). */
export function restSnapshot() {
  return state
}
export const onRestChange = subscribe

/** Aktualny stan przerwy z odświeżaniem co ćwierć sekundy. */
export function useRest() {
  const s = useSyncExternalStore(subscribe, () => state)
  const now = useNow(s ? 250 : 0)
  if (!s) return null
  const left = Math.max(0, (s.endAt - now) / 1000)
  return { ...s, left, progress: s.total > 0 ? 1 - left / s.total : 1, finished: left <= 0 }
}

/** Bieżący czas, odświeżany co `ms` (0 = bez odświeżania). */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!ms) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(id)
  }, [ms])
  return now
}

/** Ekran nie gaśnie, dopóki komponent jest widoczny (np. w trakcie treningu). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | undefined
    let cancelled = false
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
        if (cancelled) void lock.release()
      } catch {
        /* np. tryb oszczędzania baterii */
      }
    }
    void acquire()
    const onVisible = () => document.visibilityState === 'visible' && void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [active])
}
