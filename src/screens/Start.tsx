import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { navigate } from '../router'
import { activeWorkout, nextPlanDay, startWorkout } from '../lib/workout'
import { workoutPRs } from '../lib/stats'
import { clock, duration, plural, shortDate } from '../lib/format'
import { useNow } from '../lib/rest'
import { Badge, Button, Card } from '../components/ui'
import { ChevronIcon, GearIcon } from '../components/icons'
import { useExercises } from '../components/exercises'

const DAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']
const WEEKLY_GOAL = 4

/** Poniedziałek bieżącego tygodnia, godz. 00:00. */
function weekStart(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

export function Start() {
  const today = new Date()
  const monday = weekStart(today).getTime()
  const todayIdx = (today.getDay() + 6) % 7
  const exercises = useExercises()

  const running = useLiveQuery(() => activeWorkout(), [])
  const next = useLiveQuery(() => nextPlanDay(), [])
  const trainedDays = useLiveQuery(async () => {
    const list = await db.workouts.where('startedAt').aboveOrEqual(monday).toArray()
    return new Set(list.filter((w) => w.status === 'zakończony').map((w) => (new Date(w.startedAt).getDay() + 6) % 7))
  }, [monday])
  const last = useLiveQuery(async () => {
    const w = (await db.workouts.orderBy('startedAt').reverse().toArray()).find((x) => x.status === 'zakończony')
    return w ? { w, prs: (await workoutPRs(w.id)).length } : null
  }, [])
  const now = useNow(running ? 1000 : 0)

  const dateLabel = today.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
  const count = trainedDays?.size ?? 0
  const name = (id: number) => exercises.find((e) => e.id === id)?.name ?? ''

  const begin = async (planDayId?: number) => {
    const id = await startWorkout(planDayId)
    navigate({ name: 'trening', id })
  }

  return (
    <div className="flex flex-col pb-6">
      <div className="flex items-center justify-between px-5 pb-2 pt-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] text-muted">{dateLabel}</span>
          <h1 className="m-0 text-[28px] font-extrabold tracking-tight">Cześć, Piotr</h1>
        </div>
        <button
          onClick={() => navigate({ name: 'ustawienia' })}
          aria-label="Ustawienia"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-card text-ink"
        >
          <GearIcon />
        </button>
      </div>

      {running ? (
        <Card className="mx-5 mt-4 flex flex-col gap-3.5 !border-2 !border-accent p-5">
          <span className="text-[13px] font-bold tracking-wide text-accent">TRENING W TOKU</span>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[28px] font-extrabold tracking-tight">{running.name}</span>
            <span className="text-lg font-bold tabular-nums text-muted">{clock((now - running.startedAt) / 1000)}</span>
          </div>
          <Button size="lg" onClick={() => navigate({ name: 'trening', id: running.id })}>
            Wróć do treningu
          </Button>
        </Card>
      ) : (
        <Card className="mx-5 mt-4 flex flex-col gap-3.5 p-5">
          <span className="text-[13px] font-bold tracking-wide text-accent">NASTĘPNY TRENING</span>
          {next ? (
            <>
              <div className="flex flex-col gap-1">
                <span className="text-[30px] font-extrabold tracking-tight">{next.name}</span>
                <span className="text-sm text-muted">
                  {next.exercises.length} {plural(next.exercises.length, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}
                </span>
              </div>
              {next.exercises.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {next.exercises.slice(0, 3).map((e) => (
                    <span key={e.exerciseId} className="rounded-xl bg-row px-2.5 py-1.5 text-xs font-semibold">
                      {name(e.exerciseId)}
                    </span>
                  ))}
                  {next.exercises.length > 3 && (
                    <span className="rounded-xl bg-row px-2.5 py-1.5 text-xs font-semibold text-muted">
                      +{next.exercises.length - 3}
                    </span>
                  )}
                </div>
              )}
              <Button size="lg" onClick={() => begin(next.id)} disabled={next.exercises.length === 0}>
                Rozpocznij trening
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm leading-relaxed text-muted">Nie masz aktywnego planu. Utwórz go w zakładce Plany.</span>
              <Button size="lg" onClick={() => navigate({ name: 'plany' }, true)}>
                Przejdź do planów
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={() => begin()}>
            Pusty trening
          </Button>
        </Card>
      )}

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

      {last && (
        <button
          onClick={() => navigate({ name: 'sesja', id: last.w.id })}
          className="mx-5 mt-4 flex items-center justify-between gap-3 rounded-[20px] border border-solid border-line bg-card px-5 py-4 text-left"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted">Ostatni trening · {shortDate(last.w.startedAt)}</span>
            <span className="text-[15px] font-bold text-ink">
              {last.w.name} · {duration((last.w.endedAt ?? last.w.startedAt) - last.w.startedAt)}
            </span>
          </div>
          {last.prs > 0 ? (
            <Badge>
              {last.prs} {plural(last.prs, 'rekord', 'rekordy', 'rekordów')}
            </Badge>
          ) : (
            <span className="text-muted">
              <ChevronIcon />
            </span>
          )}
        </button>
      )}
    </div>
  )
}
