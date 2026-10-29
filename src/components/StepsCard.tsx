import { useCallback, useEffect, useState } from 'react'
import { connectHealth, dailySteps, healthStatus, openHealthSettings, type DaySteps, type HealthStatus } from '../lib/health'
import { isApk } from '../lib/native'
import { thousands } from '../lib/format'
import { setPref, usePref } from '../lib/prefs'
import { Button, Card } from './ui'

const DAY = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So']
const RANGE_KEY = 'silka-kroki-zakres'
const dayOf = (date: string) => new Date(`${date}T12:00`)
const dayLabel = (date: string) => dayOf(date).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })

/** Start → kroki z Google Fit (przez Health Connect). Widoczne tylko w APK. Odświeża się co minutę i po powrocie do aplikacji. */
export function StepsCard() {
  const [status, setStatus] = useState<HealthStatus | null>(null)
  const [days, setDays] = useState<DaySteps[] | null>(null)
  const range = usePref(RANGE_KEY) === '30' ? 30 : 7
  /** Wybrany dzień (data RRRR-MM-DD); null = dziś. */
  const [sel, setSel] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const st = await healthStatus()
    setStatus(st)
    if (st.steps) setDays(await dailySteps(range))
  }, [range])

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

  const todayDate = days?.[days.length - 1]?.date
  const picked = days?.find((d) => d.date === sel) ?? days?.[days.length - 1]
  const isToday = !picked || picked.date === todayDate
  const max = Math.max(1, ...(days ?? []).map((d) => d.steps))
  const past = days ? days.slice(0, -1) : []
  const avg = past.length ? Math.round(past.reduce((a, d) => a + d.steps, 0) / past.length) : 0
  const many = range === 30

  return (
    <Card className="mx-5 mt-4 flex flex-col gap-3 px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[15px] font-extrabold">Kroki</span>
        <div role="radiogroup" aria-label="Zakres" className="flex gap-0.5 rounded-full bg-soft p-0.5">
          {[7, 30].map((n) => (
            <button
              key={n}
              role="radio"
              aria-checked={range === n}
              onClick={() => {
                setSel(null)
                setPref(RANGE_KEY, n === 30 ? '30' : null)
              }}
              className={`h-8 rounded-full border-0 px-3 text-xs ${range === n ? 'bg-card font-extrabold text-ink' : 'bg-transparent font-bold text-muted'}`}
            >
              {n} dni
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[13px] text-muted">{isToday ? 'dziś' : picked && dayLabel(picked.date)}</span>
          <span className="text-[30px] font-extrabold leading-tight tracking-tight tabular-nums">{picked ? thousands(picked.steps) : '…'}</span>
        </div>
        {avg > 0 && (
          <span className="pb-1.5 text-right text-[12px] leading-snug text-muted">
            średnio {thousands(avg)}
            <br />
            na dzień
          </span>
        )}
      </div>
      {days && (
        <div className={`flex items-end ${many ? 'gap-[3px]' : 'gap-1.5'}`} aria-label={`Kroki z ostatnich ${range} dni`}>
          {days.map((d) => {
            const on = d.date === (picked?.date ?? todayDate)
            const dt = dayOf(d.date)
            const label = many ? (dt.getDay() === 1 ? String(dt.getDate()) : '') : DAY[dt.getDay()]
            return (
              <button
                key={d.date}
                onClick={() => setSel(d.date === todayDate ? null : d.date)}
                aria-label={`${dayLabel(d.date)}: ${thousands(d.steps)} kroków`}
                aria-pressed={on}
                className="flex min-w-0 flex-1 flex-col items-center gap-1 border-0 bg-transparent p-0"
              >
                <div className="flex h-14 w-full items-end">
                  <div
                    className={`w-full ${many ? 'rounded-[3px]' : 'rounded-md'} ${on ? 'bg-accent' : 'bg-soft'}`}
                    style={{ height: `${Math.max(6, (d.steps / max) * 100)}%` }}
                  />
                </div>
                <span className={`h-4 text-[11px] ${on ? 'font-extrabold text-ink' : 'text-muted'}`}>{label}</span>
              </button>
            )
          })}
        </div>
      )}
      <span className="text-[12px] text-muted">Stuknij słupek, żeby zobaczyć kroki z danego dnia.</span>
      {days && days.every((d) => d.steps === 0) && (
        <span className="text-[12px] leading-relaxed text-muted">
          Zero kroków? W Google Fit włącz Ustawienia → Synchronizuj z Health Connect.
        </span>
      )}
    </Card>
  )
}
