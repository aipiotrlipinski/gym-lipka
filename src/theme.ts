import { useEffect, useState } from 'react'
import { setPref, usePref } from './lib/prefs'
import { setAppIcon } from './lib/appIcon'

export type ThemeMode = 'system' | 'light' | 'dark'

/** Kolorystyka: domyślna (zielona/granatowa) albo jedna z wersji różowych. Kolory są w index.css. */
export type Palette = 'standard' | 'puder' | 'malina' | 'szampan' | 'fuksja' | 'roz-biel'

export const PALETTES: { id: Palette; label: string; hint: string; swatch: [string, string, string] }[] = [
  { id: 'standard', label: 'Standard', hint: 'zielony / granat', swatch: ['#f6f5f1', '#ffffff', '#1f7a4d'] },
  { id: 'puder', label: 'Pudrowy róż', hint: 'stonowany, ciepły', swatch: ['#fbf6f5', '#ffffff', '#c2577a'] },
  { id: 'malina', label: 'Malina', hint: 'biel + malinowy · ciemny: czerń', swatch: ['#fff8fa', '#ffffff', '#c2185b'] },
  { id: 'szampan', label: 'Szampan', hint: 'beż + przygaszony róż', swatch: ['#f8f1ee', '#fffcfb', '#a8546a'] },
  { id: 'fuksja', label: 'Fuksja', hint: 'biel + mocny róż', swatch: ['#fdf7fa', '#ffffff', '#d1127a'] },
  { id: 'roz-biel', label: 'Róż i biel', hint: 'różowe tło, białe karty · ciemny: czerń', swatch: ['#fde8ef', '#ffffff', '#d63f72'] },
]

const KEY = 'gl-theme'
const PALETTE_KEY = 'silka-kolory'

function readMode(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* brak dostępu do pamięci przeglądarki — zostaje motyw systemowy */
  }
  return 'system'
}

function readPalette(v: string | null): Palette {
  return PALETTES.some((p) => p.id === v) ? (v as Palette) : 'standard'
}

function apply(mode: ThemeMode) {
  const dark =
    mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  syncStatusBar()
}

/** Kolor paska systemowego = tło aplikacji (zależne od motywu i kolorystyki). */
function syncStatusBar() {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
  if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
}

/** Motyw aplikacji: systemowy, jasny albo ciemny. Wybór zapisuje się w telefonie. */
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(readMode)

  useEffect(() => {
    apply(mode)
    try {
      localStorage.setItem(KEY, mode)
    } catch {
      /* ignorujemy — motyw zadziała do zamknięcia aplikacji */
    }
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])

  return { mode, setMode }
}

/** Wybrana kolorystyka; ustawia atrybut data-palette na <html>. */
export function usePalette(): [Palette, (p: Palette) => void] {
  const palette = readPalette(usePref(PALETTE_KEY))
  useEffect(() => {
    if (palette === 'standard') delete document.documentElement.dataset.palette
    else document.documentElement.dataset.palette = palette
    syncStatusBar()
    setAppIcon(palette)
  }, [palette])
  return [palette, (p) => setPref(PALETTE_KEY, p === 'standard' ? null : p)]
}
