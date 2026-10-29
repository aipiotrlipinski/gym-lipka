import { Capacitor } from '@capacitor/core'

/** true w aplikacji APK, false w przeglądarce. */
export const isApk = Capacitor.isNativePlatform()

/**
 * Zapisuje plik tekstowy.
 * APK: zapis do pamięci aplikacji i systemowe „Udostępnij” (Dysk Google, Pliki, e-mail…).
 * Przeglądarka: zwykłe pobranie do folderu Pobrane.
 */
export async function saveTextFile(name: string, text: string, mime = 'application/json') {
  if (isApk) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    const { Share } = await import('@capacitor/share')
    const { uri } = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 })
    await Share.share({ title: name, files: [uri], dialogTitle: 'Zapisz kopię Siłki' })
    return
  }
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
