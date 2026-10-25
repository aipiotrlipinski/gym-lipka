import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { Card } from '../components/ui'
import { GearIcon } from '../components/icons'

const DAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']
const WEEKLY_GOAL = 4

/** Poniedziałek bieżącego tygodnia, godz. 00:00. */
function weekStart(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const shift = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - shift)
  return d
}

export function Start({ onOpenSettings }: { onOpenSettings: () => void }) {
  const today = new Date()
  const monday = weekStart(today)
  const todayIdx = (today.getDay() + 6) % 7

  const trainedDays = useLiveQuery(async () => {
    const list = await db.workouts.where('startedAt').aboveOrEqual(monday.getTime()).toArray()
    return new Set(list.filter((w) => w.status === 'zakończony').map((w) => (new Date(w.startedAt).getDay() + 6) % 7))
  }, [monday.getTime()])

  const dateLabel = today.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
  const count = trainedDays?.size ?? 0

  return (
    <div className="flex flex-col pb-6">
      <div className="flex items-center justify-between px-5 pb-2 pt-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] text-muted">{dateLabel}</span>
          <h1 className="m-0 text-[28px] font-extrabold tracking-tight">Cześć, Piotr</h1>
        </div>
        <button
          onClick={onOpenSettings}
          aria-label="Ustawienia"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-card text-ink"
        >
          <GearIcon />
        </button>
      </div>

      <Card className="mx-5 mt-4 flex flex-col gap-3.5 p-5">
        <span className="text-[13px] font-bold tracking-wide text-accent">NASTĘPNY TRENING</span>
        <div className="flex flex-col gap-1">
          <span className="text-[26px] font-extrabold tracking-tight">Brak planu</span>
          <span className="text-sm leading-relaxed text-muted">
            Edytor planów i ekran treningu przyjdą w etapach 1 i 2. Wtedy ten przycisk uruchomi Twój następny dzień
            z rotacji Góra / Dół.
          </span>
        </div>
        <button
          disabled
          className="h-14 rounded-2xl border-0 bg-accent text-[17px] font-extrabold text-on-accent opacity-50"
        >
          Rozpocznij trening
        </button>
      </Card>

      <Card className="mx-5 mt-4 flex flex-col gap-3.5 px-5 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[15px] font-extrabold">Ten tydzień</span>
          <span className="text-[13px] text-muted">
            {count} z {WEEKLY_GOAL} treningów
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-muted">
          {DAYS.map((label, i) => {
            const done = trainedDays?.has(i)
            const isToday = i === todayIdx
            return (
              <div key={label} className={`flex flex-col items-center gap-1.5 ${isToday ? 'font-extrabold text-ink' : ''}`}>
                <span>{label}</span>
                <span
                  className={`h-8 w-8 rounded-full ${done ? 'bg-accent' : 'bg-row'}`}
                  style={isToday && !done ? { boxShadow: 'inset 0 0 0 2px var(--accent)' } : undefined}
                />
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
