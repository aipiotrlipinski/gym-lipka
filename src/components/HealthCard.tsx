import { useEffect, useState } from 'react'
import { connectHealth, healthStatus, openHealthSettings, type HealthStatus } from '../lib/health'
import { isApk } from '../lib/native'
import { Button, Card } from './ui'

/** Ustawienia → Google Fit: stan połączenia z Health Connect. W przeglądarce wyjaśnia, że to działa tylko w APK. */
export function HealthCard() {
  const [st, setSt] = useState<HealthStatus | null>(null)
  useEffect(() => {
    healthStatus().then(setSt)
  }, [])

  if (!isApk) {
    return (
      <p className="mx-5 m-0 text-[13px] leading-relaxed text-muted">
        Kroki z Google Fit i zapis treningów do Google Fit działają w wersji APK aplikacji.
      </p>
    )
  }
  if (!st) return null

  const row = (label: string, on: boolean) => (
    <div className="flex items-center justify-between border-b border-line px-4 py-3.5 last:border-b-0">
      <span className="text-[15px] font-bold">{label}</span>
      <span className={`text-[13px] font-bold ${on ? 'text-accent' : 'text-muted'}`}>{on ? 'włączone' : 'wyłączone'}</span>
    </div>
  )

  return (
    <>
      <Card className="mx-5 flex flex-col">
        {st.status === 'available' ? (
          <>
            {row('Kroki na ekranie Start', st.steps)}
            {row('Treningi i kalorie do Google Fit', st.writeWorkout)}
          </>
        ) : (
          <div className="px-4 py-3.5 text-[13px] leading-relaxed text-muted">
            {st.status === 'update_required' ? 'Health Connect wymaga aktualizacji.' : 'Brak Health Connect na tym telefonie.'}
          </div>
        )}
      </Card>
      <div className="mx-5 mt-3 flex flex-col gap-2">
        {st.status === 'available' && !(st.steps && st.writeWorkout) && (
          <Button onClick={async () => setSt(await connectHealth().catch(() => st))}>Połącz z Google Fit</Button>
        )}
        <Button variant="soft" onClick={openHealthSettings}>
          {st.status === 'available' ? 'Uprawnienia w Health Connect' : 'Otwórz Sklep Play'}
        </Button>
      </div>
      <p className="mx-5 mt-3 text-[13px] leading-relaxed text-muted">
        Google Fit przekazuje kroki przez Health Connect. Jeśli kroki się nie pojawiają, w Google Fit włącz Ustawienia → Synchronizuj z
        Health Connect.
      </p>
    </>
  )
}
