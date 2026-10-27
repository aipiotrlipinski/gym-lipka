import type { CapacitorConfig } from '@capacitor/cli'

// Aplikacja APK: ten sam kod co wersja przeglądarkowa, opakowany przez Capacitor.
const config: CapacitorConfig = {
  appId: 'pl.lipka.gym',
  appName: 'Gym Lipka',
  webDir: 'dist',
  android: {
    backgroundColor: '#F6F5F1',
  },
}

export default config
