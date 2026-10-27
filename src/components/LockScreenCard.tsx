import { useEffect, useState } from 'react'
import { lockScreenStatus, openNotificationSettings } from '../lib/lockscreen'
import { Button, Card } from './ui'

/** Ustawienia → Ekran blokady: czy powiadomienie treningowe może się pokazać. Tylko w APK. */
export function LockScreenCard() {
  const [st, setSt] = useState<{ enabled: boolean; channelBlocked: boolean } | null>(null)
  useEffect(() => {
    const load = () => lockScreenStatus().then(setSt)
    load()
    document.addEventListener('visibilitychange', load)
    return () => document.removeEventListener('visibilitychange', load)
  }, [])
  if (!st) return null
  const ok = st.enabled && !st.channelBlocked
  return (
    <>
      <div className="px-5 pb-2 pt-6 text-[13px] font-bold tracking-wide text-muted">EKRAN BLOKADY</div>
      <Card className="mx-5 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-[15px] font-bold">Seria i przerwa na blokadzie</span>
          <span className={`text-[13px] font-bold ${ok ? 'text-accent' : 'text-[#C0392B]'}`}>{ok ? 'włączone' : 'zablokowane'}</span>
        </div>
      </Card>
      <div className="mx-5 mt-3">
        <Button variant="soft" onClick={openNotificationSettings}>
          Ustawienia powiadomień
        </Button>
      </div>
      <p className="mx-5 mt-3 text-[13px] leading-relaxed text-muted">
        Powiadomienie pojawia się, gdy trwa trening. Jeśli go nie widać na blokadzie, w ustawieniach powiadomień telefonu włącz pokazywanie
        treści na ekranie blokady (np. „Pokazuj wszystko” / „Pokazuj treść”).
      </p>
    </>
  )
}
