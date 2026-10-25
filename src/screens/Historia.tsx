import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, type BodyMeasurement } from '../db'
import { navigate } from '../router'
import { duration, kg, plural, shortDate, thousands, volume } from '../lib/format'
import { Button, Card, Empty, RoundButton, ScreenTitle, SectionLabel, Sheet, Stepper } from '../components/ui'
import { BackIcon, ChevronIcon, TrashIcon } from '../components/icons'
import { LineChart } from '../components/LineChart'

const MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień']

export function Historia() {
  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [weightSheet, setWeightSheet] = useState(false)
  const from = new Date(ym.y, ym.m, 1).getTime()
  const to = new Date(ym.y, ym.m + 1, 1).getTime()

  const month = useLiveQuery(async () => {
    const ws = (await db.workouts.where('startedAt').between(from, to).toArray())
      .filter((w) => w.status === 'zakończony')
      .sort((a, b) => b.startedAt - a.startedAt)
    const sets = await db.sets.where('workoutId').anyOf(ws.map((w) => w.id)).toArray()
    return ws.map((w) => ({ w, sets: sets.filter((s) => s.workoutId === w.id) }))
  }, [from, to])
  const body = useLiveQuery(() => db.body.orderBy('date').toArray(), [])

  const trained = new Set(month?.map(({ w }) => new Date(w.startedAt).getDate()))
  const lead = (new Date(ym.y, ym.m, 1).getDay() + 6) % 7
  const daysIn = new Date(ym.y, ym.m + 1, 0).getDate()
  const isThisMonth = ym.y === now.getFullYear() && ym.m === now.getMonth()
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)

  const shift = (d: number) => setYm(({ y, m }) => ({ y: m + d < 0 ? y - 1 : m + d > 11 ? y + 1 : y, m: (m + d + 12) % 12 }))
  const count = month?.length ?? 0

  return (
    <div className="pb-8">
      <ScreenTitle
        action={
          <span className="text-[13px] text-muted">
            {count} {plural(count, 'trening', 'treningi', 'treningów')}
          </span>
        }
      >
        Historia
      </ScreenTitle>

      <Card className="mx-5 mt-3 flex flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between">
          <RoundButton label="Poprzedni miesiąc" onClick={() => shift(-1)}>
            <BackIcon size={18} />
          </RoundButton>
          <span className="text-base font-extrabold">
            {MONTHS[ym.m]} {ym.y}
          </span>
          <RoundButton label="Następny miesiąc" onClick={() => shift(1)}>
            <ChevronIcon />
          </RoundButton>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-muted">
          {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <span key={i} />
            const on = trained.has(d)
            const today = isThisMonth && d === now.getDate()
            const future = isThisMonth ? d > now.getDate() : new Date(ym.y, ym.m, d) > now
            return (
              <span key={i} className="flex h-9 items-center justify-center">
                <span
                  className={`flex h-[34px] w-[34px] items-center justify-center rounded-full text-[13px] ${
                    on ? 'bg-accent font-extrabold text-on-accent' : future ? 'text-muted' : 'font-medium text-ink'
                  } ${today ? 'font-extrabold' : ''}`}
                  style={today && !on ? { boxShadow: 'inset 0 0 0 2px var(--accent)' } : undefined}
                >
                  {d}
                </span>
              </span>
            )
          })}
        </div>
      </Card>

      <SectionLabel>TRENINGI</SectionLabel>
      {month && month.length === 0 && <Empty title="Brak treningów w tym miesiącu" />}
      <div className="mx-5 flex flex-col gap-2">
        {month?.map(({ w, sets }) => {
          const work = sets.filter((s) => s.done && s.type !== 'rozgrzewka').length
          return (
            <button
              key={w.id}
              onClick={() => navigate({ name: 'sesja', id: w.id })}
              className="flex flex-col gap-1.5 rounded-[20px] border border-solid border-line bg-card px-4 py-3.5 text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-extrabold text-ink">{w.name}</span>
                <span className="text-muted">
                  <ChevronIcon />
                </span>
              </div>
              <span className="text-[13px] text-muted">
                {shortDate(w.startedAt)} · {duration((w.endedAt ?? w.startedAt) - w.startedAt)} · {work}{' '}
                {plural(work, 'seria', 'serie', 'serii')} · {thousands(volume(sets))} kg
              </span>
            </button>
          )
        })}
      </div>

      <SectionLabel
        action={
          <Button variant="outline" size="sm" onClick={() => setWeightSheet(true)}>
            + Dodaj pomiar
          </Button>
        }
      >
        MASA CIAŁA
      </SectionLabel>
      <Card className="mx-5 px-4 py-3">
        {body && body.length > 0 ? (
          <>
            <div className="text-[26px] font-extrabold tracking-tight">{kg(body[body.length - 1].weightKg)} kg</div>
            <LineChart points={body.map((b) => ({ x: b.date, y: b.weightKg }))} unit="kg" label="Masa ciała w czasie" />
          </>
        ) : (
          <p className="m-0 py-2 text-sm text-muted">Dodaj pierwszy pomiar, żeby zobaczyć wykres.</p>
        )}
      </Card>
      {weightSheet && <WeightSheet last={body?.[body.length - 1]} all={body ?? []} onClose={() => setWeightSheet(false)} />}
    </div>
  )
}

function WeightSheet({ last, all, onClose }: { last?: BodyMeasurement; all: BodyMeasurement[]; onClose: () => void }) {
  const [w, setW] = useState(last?.weightKg ?? 80)
  return (
    <Sheet title="Masa ciała" onClose={onClose}>
      <div className="flex flex-col gap-3 px-5 pb-2">
        <Stepper label="Masa ciała" value={w} step={0.1} decimal suffix="kg" onChange={(v) => setW(Math.round(v * 10) / 10)} />
        <Button
          size="lg"
          onClick={async () => {
            await db.body.add({ date: Date.now(), weightKg: w } as BodyMeasurement)
            onClose()
          }}
        >
          Zapisz dzisiejszy pomiar
        </Button>
        {all.length > 0 && (
          <>
            <span className="pt-2 text-[13px] font-bold text-muted">OSTATNIE POMIARY</span>
            {[...all]
              .reverse()
              .slice(0, 8)
              .map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-2xl bg-card px-4 py-1.5">
                  <span className="text-sm text-muted">{shortDate(b.date)}</span>
                  <span className="flex items-center gap-2 text-[15px] font-bold">
                    {kg(b.weightKg)} kg
                    <button aria-label="Usuń pomiar" onClick={() => db.body.delete(b.id)} className="flex h-10 w-10 items-center justify-center border-0 bg-transparent text-muted">
                      <TrashIcon />
                    </button>
                  </span>
                </div>
              ))}
          </>
        )}
      </div>
    </Sheet>
  )
}
