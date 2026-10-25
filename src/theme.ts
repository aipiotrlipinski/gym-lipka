import { useEffect, useState } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'

const KEY = 'gl-theme'
const BG = { light: '#F6F5F1', dark: '#0F172A' }

function readMode(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* brak dostępu do pamięci przeglądarki — zostaje motyw systemowy */
  }
  return 'system'
}

function apply(mode: ThemeMode) {
  const dark =
    mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const theme = dark ? 'dark' : 'light'
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BG[theme])
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
