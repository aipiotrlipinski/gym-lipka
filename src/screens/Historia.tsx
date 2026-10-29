import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ReactNode } from 'react'
import { db, type BodyMeasurement } from '../db'
import { navigate } from '../router'
import { duration, plural, shortDate, thousands, volume } from '../lib/format'
import { useCollapsed } from '../lib/prefs'
import { METRICS, fmtValue, latest, metric, parseNum, seriesOf, summary, withUnit, type MetricKey } from '../lib/body'
import { Button, Card, Empty, RoundButton, ScreenTitle, Sheet } from '../components/ui'
import { BackIcon, ChevronIcon, DownIcon, TrashIcon, UpIcon } from '../components/icons'
import { LineChart } from '../components/LineChart'

/** Nagłówek sekcji, który zwija i rozwija jej zawartość. Stan zapamiętuje się w telefonie. */
function Collapsible({ id, title, extra, action, children }: { id: string; title: string; extra?: ReactNode; action?: ReactNode; children: ReactNode }) {
  const [collapsed, toggle] = useCollapsed(id)
  return (
    <section>
      <div className="flex items-center justify-between gap-2 px-5 pb-2 pt-5">
        <button
          onClick={toggle}
          aria-expanded={!collapsed}
          className="flex min-h-9 min-w-0 flex-1 items-center gap-1.5 border-0 bg-transparent p-0 text-left text-[13px] font-bold tracking-wide text-muted"
        >
          {collapsed ? <DownIcon size={16} /> : <UpIcon size={16} />}
          <span className="truncate">{title}</span>
          {collapsed && extra && <span className="truncate font-semibold normal-case tracking-normal">· {extra}</span>}
        </button>
        {!collapsed && action}
      </div>
      {!collapsed && children}
    </section>
  )
}

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
  const lastWeight = body ? seriesOf(body, 'weightKg').at(-1)?.y : undefined

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

      <Collapsible id="historia" title="HISTORIA TRENINGÓW" extra={`${MONTHS[ym.m].toLowerCase()} ${ym.y}`}>
      <Card className="mx-5 flex flex-col gap-2.5 p-4">
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

      <div className="h-3" />
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

      </Collapsible>

      <Collapsible
        id="cialo"
        title="MASA CIAŁA I POMIARY"
        extra={lastWeight !== undefined ? withUnit(lastWeight, metric('weightKg')) : undefined}
        action={
          <Button variant="outline" size="sm" onClick={() => setWeightSheet(true)}>
            + Dodaj pomiar
          </Button>
        }
      >
        <BodyCard body={body ?? []} onAdd={() => setWeightSheet(true)} />
      </Collapsible>
      {weightSheet && <MeasureSheet all={body ?? []} onClose={() => setWeightSheet(false)} />}
    </div>
  )
}

/** Najnowsze wartości jako kafelki; stuknięcie kafelka pokazuje wykres tej miary. */
function BodyCard({ body, onAdd }: { body: BodyMeasurement[]; onAdd: () => void }) {
  const [sel, setSel] = useState<MetricKey>('weightKg')
  const tiles = latest(body)
  if (tiles.length === 0) {
    return (
      <Card className="mx-5 flex flex-col gap-3 px-4 py-4">
        <p className="m-0 text-sm leading-relaxed text-muted">
          Zapisuj wagę, skład ciała (tłuszcz, woda, mięśnie…) i obwody — zobaczysz tu ostatnie wartości i wykresy.
        </p>
        <Button variant="soft" onClick={onAdd}>
          Dodaj pierwszy pomiar
        </Button>
      </Card>
    )
  }
  const active = tiles.find((t) => t.metric.key === sel) ?? tiles[0]
  const m = active.metric
  const groups = [
    { id: 'sklad', label: 'Skład ciała' },
    { id: 'obwody', label: 'Obwody' },
  ] as const
  return (
    <Card className="mx-5 flex flex-col gap-3 px-4 py-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[15px] font-extrabold">{m.label}</span>
        <span className="text-[12px] text-muted">{shortDate(active.date)}</span>
      </div>
      <div className="text-[26px] font-extrabold leading-none tracking-tight">{withUnit(active.value, m)}</div>
      <LineChart points={seriesOf(body, m.key)} unit={m.unit} label={`${m.label} w czasie`} />
      {groups.map((g) => {
        const list = tiles.filter((t) => t.metric.group === g.id)
        if (list.length === 0) return null
        return (
          <div key={g.id} className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold text-muted">{g.label.toUpperCase()}</span>
            <div className="grid grid-cols-3 gap-1.5">
              {list.map((t) => {
                const on = t.metric.key === m.key
                const d = t.delta
                const good = d !== undefined && d !== 0 && (t.metric.lowerIsBetter ? d < 0 : undefined)
                return (
                  <button
                    key={t.metric.key}
                    onClick={() => setSel(t.metric.key)}
                    aria-pressed={on}
                    className={`flex min-w-0 flex-col items-start gap-0.5 rounded-2xl border-2 border-solid px-2.5 py-2 text-left ${
                      on ? 'border-accent bg-card' : 'border-transparent bg-row'
                    }`}
                  >
                    <span className="w-full truncate text-[11px] font-bold text-muted">{t.metric.short}</span>
                    <span className="w-full truncate text-[15px] font-extrabold text-ink">
                      {fmtValue(t.value, t.metric)}
                      {t.metric.unit && <span className="text-[11px] font-bold text-muted"> {t.metric.unit}</span>}
                    </span>
                    {d !== undefined && d !== 0 && (
                      <span className={`text-[11px] font-bold ${good === true ? 'text-accent' : 'text-muted'}`}>
                        {d > 0 ? '▲' : '▼'} {fmtValue(Math.abs(d), t.metric)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </Card>
  )
}

const todayInput = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Nowy pomiar: dowolne z pól (puste się nie zapisują) + lista ostatnich pomiarów. */
function MeasureSheet({ all, onClose }: { all: BodyMeasurement[]; onClose: () => void }) {
  const [vals, setVals] = useState<Partial<Record<MetricKey, string>>>({})
  const [date, setDate] = useState(todayInput)
  const [showCirc, setShowCirc] = useState(() => all.some((b) => METRICS.some((m) => m.group === 'obwody' && typeof b[m.key] === 'number')))
  const last = new Map(latest(all).map((t) => [t.metric.key, t.value]))
  const parsed = METRICS.flatMap((m) => {
    const n = parseNum(vals[m.key] ?? '')
    return n === undefined ? [] : [[m.key, n] as const]
  })

  const save = async () => {
    const isToday = date === todayInput()
    // Dziś = aktualna godzina (kolejność kilku pomiarów z jednego dnia); inny dzień = południe.
    const ts = isToday || !date ? Date.now() : new Date(`${date}T12:00`).getTime()
    await db.body.add({ date: ts, ...Object.fromEntries(parsed) } as BodyMeasurement)
    onClose()
  }

  const field = (key: MetricKey) => {
    const m = metric(key)
    const prev = last.get(key)
    return (
      <label key={key} className="flex min-w-0 flex-col gap-1 text-[12px] font-bold text-muted">
        <span className="truncate">{m.label}</span>
        <span className="flex h-12 items-center gap-1 rounded-[14px] border border-solid border-line bg-card px-3 focus-within:border-accent">
          <input
            inputMode={m.decimals ? 'decimal' : 'numeric'}
            value={vals[key] ?? ''}
            placeholder={prev !== undefined ? fmtValue(prev, m) : '—'}
            onChange={(e) => setVals((v) => ({ ...v, [key]: e.target.value.replace(/[^\d.,]/g, '') }))}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[17px] font-extrabold text-ink outline-none placeholder:font-semibold placeholder:text-muted/60"
          />
          {m.unit && <span className="shrink-0 text-xs font-bold text-muted">{m.unit}</span>}
        </span>
      </label>
    )
  }

  return (
    <Sheet title="Nowy pomiar" onClose={onClose}>
      <div className="flex flex-col gap-3 px-5 pb-2">
        <label className="flex flex-col gap-1 text-[12px] font-bold text-muted">
          Data
          <input
            type="date"
            value={date}
            max={todayInput()}
            onChange={(e) => setDate(e.target.value)}
            className="h-12 rounded-[14px] border border-solid border-line bg-card px-3 text-[15px] font-bold text-ink outline-none"
          />
        </label>
        <p className="m-0 text-[12px] leading-snug text-muted">Wpisz tylko to, co zmierzyłeś — puste pola się nie zapisują. Szare liczby to poprzedni wynik.</p>
        <span className="pt-1 text-[13px] font-bold text-muted">SKŁAD CIAŁA</span>
        <div className="grid grid-cols-2 gap-2.5">{METRICS.filter((m) => m.group === 'sklad').map((m) => field(m.key))}</div>
        <button
          onClick={() => setShowCirc((v) => !v)}
          aria-expanded={showCirc}
          className="flex items-center gap-1.5 border-0 bg-transparent p-0 pt-1 text-left text-[13px] font-bold text-muted"
        >
          {showCirc ? <UpIcon size={16} /> : <DownIcon size={16} />} OBWODY (CM)
        </button>
        {showCirc && <div className="grid grid-cols-2 gap-2.5">{METRICS.filter((m) => m.group === 'obwody').map((m) => field(m.key))}</div>}
        <Button size="lg" onClick={save} disabled={parsed.length === 0} className="mt-1">
          {parsed.length === 0 ? 'Wpisz co najmniej jeden wynik' : `Zapisz pomiar (${parsed.length})`}
        </Button>
        {all.length > 0 && (
          <>
            <span className="pt-2 text-[13px] font-bold text-muted">OSTATNIE POMIARY</span>
            {[...all]
              .sort((a, b) => b.date - a.date)
              .slice(0, 12)
              .map((b) => (
                <div key={b.id} className="flex items-center gap-2 rounded-2xl bg-card py-1.5 pl-4 pr-1">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[12px] text-muted">{shortDate(b.date)}</span>
                    <span className="text-[14px] font-bold leading-snug">{summary(b) || '—'}</span>
                  </div>
                  <button aria-label="Usuń pomiar" onClick={() => db.body.delete(b.id)} className="flex h-10 w-10 shrink-0 items-center justify-center border-0 bg-transparent text-muted">
                    <TrashIcon />
                  </button>
                </div>
              ))}
          </>
        )}
      </div>
    </Sheet>
  )
}
