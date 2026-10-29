import { registerPlugin } from '@capacitor/core'
import { isApk } from './native'

/** Ikona aplikacji w kolorze kolorystyki (tylko APK). Zmienia się po zminimalizowaniu aplikacji. */
const SilkaIcon = registerPlugin<{ set(o: { palette: string }): Promise<void> }>('SilkaIcon')

export function setAppIcon(palette: string) {
  if (!isApk) return
  SilkaIcon.set({ palette }).catch(() => {
    /* starsza wersja APK bez modułu ikony — ikona zostaje bez zmian */
  })
}
