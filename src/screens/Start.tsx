import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { navigate } from '../router'
import { activeWorkout, nextPlanDay, startWorkout } from '../lib/workout'
import { workoutPRs } from '../lib/stats'
import { clock, duration, plural, shortDate } from '../lib/format'
import { useNow } from '../lib/rest'
import { Badge, Button, Card } from '../components/ui'
import { GearIcon } from '../components/icons'
import { useExercises } from '../components/exercises'
import { StepsCard } from '../components/StepsCard'
import { useName } from '../lib/prefs'

const DAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']
const WEEKLY_GOAL = 4
/** Ile ćwiczeń z planu pokazać na Start (dwie kolumny). */
const MAX_LISTED = 8

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
  const userName = useName()

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

  const tile = 'flex min-w-0 flex-col gap-1.5 rounded-card border border-solid border-line bg-card p-3.5 text-left'

  return (
    <div className="flex flex-col pb-4">
      <div className="flex items-center justify-between px-4 pb-1 pt-4">
        <div className="flex min-w-0 flex-col">
          <span className="text-[12px] text-muted">{dateLabel}</span>
          <h1 className="m-0 truncate font-head text-[24px] font-extrabold tracking-tight">{userName ? `Cześć, ${userName}` : 'Cześć'}</h1>
        </div>
        <button
          onClick={() => navigate({ name: 'ustawienia' })}
          aria-label="Ustawienia"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-card text-ink"
        >
          <GearIcon />
        </button>
      </div>

      {running ? (
        <Card className="mx-4 mt-2.5 flex flex-col gap-2.5 !border-2 !border-accent p-4">
          <span className="label text-[11px] font-bold text-accent">Trening w toku</span>
          <div className="flex items-baseline justify-between gap-3">
            <span className="head truncate text-[30px] font-extrabold leading-none">{running.name}</span>
            <span className="font-num text-lg font-bold tabular-nums text-muted">{clock((now - running.startedAt) / 1000)}</span>
          </div>
          <Button size="lg" onClick={() => navigate({ name: 'trening', id: running.id })}>
            Wróć do treningu
          </Button>
        </Card>
      ) : (
        <Card className="mx-4 mt-2.5 flex flex-col gap-2.5 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="label text-[11px] font-bold text-accent">Następny trening</span>
            {next && (
              <span className="text-[12px] text-muted">
                {next.exercises.length} {plural(next.exercises.length, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}
              </span>
            )}
          </div>
          {next ? (
            <>
              <span className="head text-[34px] font-extrabold leading-[0.95]">{next.name}</span>
              {next.exercises.length > 0 && (
                <ol className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-1 p-0 text-[13px]">
                  {next.exercises.slice(0, MAX_LISTED).map((e, i) => (
                    <li key={e.exerciseId} className="flex min-w-0 gap-1.5">
                      <span className="font-num font-bold text-accent tabular-nums">{i + 1}</span>
                      <span className="truncate">{name(e.exerciseId)}</span>
                    </li>
                  ))}
                  {next.exercises.length > MAX_LISTED && (
                    <li className="text-muted">+{next.exercises.length - MAX_LISTED} więcej</li>
                  )}
                </ol>
              )}
              <div className="mt-1 flex gap-2">
                <Button size="lg" className="flex-1" onClick={() => begin(next.id)} disabled={next.exercises.length === 0}>
                  ROZPOCZNIJ TRENING
                </Button>
                <EmptyWorkoutButton onClick={() => begin()} />
              </div>
            </>
          ) : (
            <>
              <span className="text-sm leading-relaxed text-muted">Nie masz aktywnego planu. Utwórz go w zakładce Plany.</span>
              <div className="flex gap-2">
                <Button size="lg" className="flex-1" onClick={() => navigate({ name: 'plany' }, true)}>
                  Przejdź do planów
                </Button>
                <EmptyWorkoutButton onClick={() => begin()} />
              </div>
            </>
          )}
        </Card>
      )}

      <div className="mx-4 mt-2.5 grid grid-cols-2 gap-2.5">
        <div className={tile}>
          <span className="text-[12px] text-muted">Ten tydzień</span>
          <span className="font-num text-[28px] font-bold leading-none tabular-nums">
            {count}
            <span className="text-muted">/{WEEKLY_GOAL}</span>
          </span>
          <div className="mt-1 flex justify-between" aria-label={`Treningi w tym tygodniu: ${count} z ${WEEKLY_GOAL}`}>
            {DAYS.map((label, i) => {
              const done = trainedDays?.has(i)
              const isToday = i === todayIdx
              return (
                <span
                  key={label}
                  title={label}
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[8px] font-bold ${
                    done ? 'bg-accent text-on-accent' : 'bg-soft text-muted'
                  }`}
                  style={isToday && !done ? { boxShadow: 'inset 0 0 0 1.5px var(--accent)' } : undefined}
                >
                  {label[0]}
                </span>
              )
            })}
          </div>
        </div>

        {last ? (
          <button onClick={() => navigate({ name: 'sesja', id: last.w.id })} className={tile}>
            <span className="text-[12px] text-muted">Ostatni · {shortDate(last.w.startedAt)}</span>
            <span className="truncate text-[15px] font-extrabold text-ink">{last.w.name}</span>
            <span className="font-num text-[13px] text-muted">{duration((last.w.endedAt ?? last.w.startedAt) - last.w.startedAt)}</span>
            {last.prs > 0 && (
              <span className="mt-auto self-start">
                <Badge>
                  {last.prs} {plural(last.prs, 'rekord', 'rekordy', 'rekordów')}
                </Badge>
              </span>
            )}
          </button>
        ) : (
          <div className={tile}>
            <span className="text-[12px] text-muted">Ostatni trening</span>
            <span className="text-[13px] leading-snug text-muted">Tu pojawi się Twój ostatni trening.</span>
          </div>
        )}
      </div>

      <StepsCard />
    </div>
  )
}

/** Kwadratowy przycisk „Pusty trening” obok głównego przycisku startu. */
function EmptyWorkoutButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Pusty trening"
      title="Pusty trening"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-btn border border-solid border-line bg-transparent text-ink"
    >
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  )
}
