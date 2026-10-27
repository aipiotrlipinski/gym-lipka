import { useCallback, useEffect, useState } from 'react'
import { connectHealth, dailySteps, healthStatus, openHealthSettings, type DaySteps, type HealthStatus } from '../lib/health'
import { isApk } from '../lib/native'
import { thousands } from '../lib/format'
import { Button, Card } from './ui'

const DAY = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So']

/** Start → kroki z Google Fit (przez Health Connect). Widoczne tylko w APK. Odświeża się co minutę i po powrocie do aplikacji. */
export function StepsCard() {
  const [status, setStatus] = useState<HealthStatus | null>(null)
  const [days, setDays] = useState<DaySteps[] | null>(null)

  const refresh = useCallback(async () => {
    const st = await healthStatus()
    setStatus(st)
    if (st.steps) setDays(await dailySteps(7))
  }, [])

  useEffect(() => {
    if (!isApk) return
    refresh()
    const t = setInterval(() => document.visibilityState === 'visible' && refresh(), 60_000)
    let remove: (() => void) | undefined
    import('@capacitor/app').then(({ App }) =>
      App.addListener('resume', refresh).then((h) => {
        remove = () => h.remove()
      }),
    )
    return () => {
      clearInterval(t)
      remove?.()
    }
  }, [refresh])

  if (!isApk || !status) return null

  if (status.status !== 'available') {
    return (
      <Card className="mx-5 mt-4 flex flex-col gap-3 px-5 py-4">
        <span className="text-[15px] font-extrabold">Kroki</span>
        <span className="text-[13px] leading-relaxed text-muted">
          {status.status === 'update_required'
            ? 'Zaktualizuj Health Connect, żeby widzieć kroki z Google Fit.'
            : 'Zainstaluj Health Connect ze Sklepu Play, żeby widzieć kroki z Google Fit.'}
        </span>
        <Button variant="soft" onClick={openHealthSettings}>
          Otwórz Sklep Play
        </Button>
      </Card>
    )
  }

  if (!status.steps) {
    return (
      <Card className="mx-5 mt-4 flex flex-col gap-3 px-5 py-4">
        <span className="text-[15px] font-extrabold">Kroki z Google Fit</span>
        <span className="text-[13px] leading-relaxed text-muted">
          Połącz z Health Connect: zobaczysz tu kroki, a treningi trafią do Google Fit razem z kaloriami.
        </span>
        <Button
          onClick={async () => {
            await connectHealth().catch(() => null)
            refresh()
          }}
        >
          Połącz z Google Fit
        </Button>
      </Card>
    )
  }

  const today = days?.[days.length - 1]?.steps ?? 0
  const max = Math.max(1, ...(days ?? []).map((d) => d.steps))
  const avg = days && days.length > 1 ? Math.round(days.slice(0, -1).reduce((a, d) => a + d.steps, 0) / (days.length - 1)) : 0

  return (
    <Card className="mx-5 mt-4 flex flex-col gap-3 px-5 py-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] font-extrabold">Kroki dziś</span>
        {avg > 0 && <span className="text-[13px] text-muted">średnio {thousands(avg)} / dzień</span>}
      </div>
      <span className="text-[30px] font-extrabold tracking-tight tabular-nums">{days ? thousands(today) : '…'}</span>
      {days && (
        <div className="grid grid-cols-7 items-end gap-1.5" aria-label="Kroki z ostatnich 7 dni">
          {days.map((d, i) => {
            const isToday = i === days.length - 1
            return (
              <div key={d.date} className="flex flex-col items-center gap-1">
                <div className="flex h-12 w-full items-end">
                  <div
                    className={`w-full rounded-md ${isToday ? 'bg-accent' : 'bg-row'}`}
                    style={{ height: `${Math.max(6, (d.steps / max) * 100)}%` }}
                    title={`${thousands(d.steps)} kroków`}
                  />
                </div>
                <span className={`text-[11px] ${isToday ? 'font-extrabold text-ink' : 'text-muted'}`}>{DAY[new Date(`${d.date}T12:00`).getDay()]}</span>
              </div>
            )
          })}
        </div>
      )}
      {days && days.every((d) => d.steps === 0) && (
        <span className="text-[12px] leading-relaxed text-muted">
          Zero kroków? W Google Fit włącz Ustawienia → Synchronizuj z Health Connect.
        </span>
      )}
    </Card>
  )
}
