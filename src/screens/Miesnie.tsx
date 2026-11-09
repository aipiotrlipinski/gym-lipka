import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db, type Exercise, type WorkoutSet } from '../db'
import { back, navigate } from '../router'
import { MUSCLE_LIST, muscleAt, muscleById, muscleIndex, type MuscleId } from '../data/muscles'
import { exercisesFor, fmtSets, level, muscleVolume } from '../lib/muscleMap'
import { measureOf } from '../lib/measure'
import { plural, setLabelAs, shortDate } from '../lib/format'
import { setPref, usePref } from '../lib/prefs'
import { BodyMap, LEVEL_FILL } from '../components/BodyMap'
import { VIEWS, type Side } from '../components/bodyShapes'
import { ExerciseThumb } from '../components/ExercisePhoto'
import { equipmentLabel } from '../components/exercises'
import { Card, RoundButton, ScreenTitle } from '../components/ui'
import { BackIcon, ChevronIcon } from '../components/icons'

const RANGE_KEY = 'silka-miesnie-zakres'
const DAY = 24 * 60 * 60 * 1000

/** Przełącznik w kształcie pigułki (jak zakres kroków na Start). */
function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { id: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-0.5 rounded-full bg-soft p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`h-8 rounded-full border-0 px-3 text-xs ${value === o.id ? 'bg-card font-extrabold text-ink' : 'bg-transparent font-bold text-muted'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

interface Last {
  at: number
  text: string
}

/** Wszystkie treningi i serie — do kolorów mapy i „ostatnio” przy ćwiczeniach. */
function useTrainingData() {
  return useLiveQuery(async () => {
    const [workouts, sets, exercises] = await Promise.all([db.workouts.toArray(), db.sets.toArray(), db.exercises.toArray()])
    return { workouts, sets, exercises }
  }, [])
}

/** Ostatni trening z każdym ćwiczeniem: data i najlepsza seria robocza. */
function lastByExercise(workoutAt: Map<number, number>, sets: WorkoutSet[], exercises: Map<number, Exercise>) {
  const byEx = new Map<number, { at: number; sets: WorkoutSet[] }>()
  for (const s of sets) {
    if (!s.done || s.type === 'rozgrzewka') continue
    const at = workoutAt.get(s.workoutId)
    if (at === undefined) continue
    const cur = byEx.get(s.exerciseId)
    if (!cur || at > cur.at) byEx.set(s.exerciseId, { at, sets: [s] })
    else if (at === cur.at) cur.sets.push(s)
  }
  const out = new Map<number, Last>()
  for (const [id, { at, sets: ss }] of byEx) {
    const top = [...ss].sort((a, b) => b.weightKg - a.weightKg || b.reps - a.reps || (b.durationSec ?? 0) - (a.durationSec ?? 0))[0]
    out.set(id, { at, text: setLabelAs(measureOf(exercises.get(id)), top) })
  }
  return out
}

function ExerciseRow({ e, last, divider }: { e: Exercise; last?: Last; divider: boolean }) {
  return (
    <button
      onClick={() => navigate({ name: 'cwiczenie', id: e.id })}
      className={`flex w-full items-center justify-between gap-3 border-0 bg-transparent py-2.5 pl-2.5 pr-4 text-left ${
        divider ? 'border-b border-solid border-line' : ''
      }`}
    >
      <ExerciseThumb exercise={e} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-bold text-ink">{e.name}</span>
        <span className="text-xs text-muted">
          {last ? (
            <>
              ostatnio {shortDate(last.at)} · <b className="font-extrabold text-ink">{last.text}</b>
            </>
          ) : (
            equipmentLabel(e.equipment)
          )}
        </span>
      </div>
      <ChevronIcon />
    </button>
  )
}

function ExerciseList({ title, items, last }: { title: string; items: Exercise[]; last: Map<number, Last> }) {
  if (!items.length) return null
  // Najpierw ćwiczenia, które już robiłeś (od najświeższego), potem reszta alfabetycznie.
  const sorted = [...items].sort((a, b) => (last.get(b.id)?.at ?? 0) - (last.get(a.id)?.at ?? 0) || a.name.localeCompare(b.name, 'pl'))
  return (
    <>
      <div className="px-5 pb-2 pt-5 text-[13px] font-bold tracking-wide text-muted">
        {title} · {items.length}
      </div>
      <div className="mx-5 overflow-hidden rounded-[20px] border border-line bg-card">
        {sorted.map((e, i) => (
          <ExerciseRow key={e.id} e={e} last={last.get(e.id)} divider={i < sorted.length - 1} />
        ))}
      </div>
    </>
  )
}

function Legend({ days }: { days: number }) {
  const steps = ['0', '1–3', '4–7', '8–11', '12+']
  return (
    <div className="flex flex-col items-center gap-1.5 px-5 pt-1">
      <div className="flex items-center gap-2.5">
        {steps.map((s, i) => (
          <span key={s} className="flex items-center gap-1 text-[11px] font-bold text-muted tabular-nums">
            <span className="h-3 w-3 rounded-[4px]" style={{ background: LEVEL_FILL[i] }} />
            {s}
          </span>
        ))}
      </div>
      <span className="text-[11px] text-muted">
        serii tygodniowo{days > 7 ? ' (średnio z 30 dni)' : ''} · stuknij mięsień, żeby zobaczyć ćwiczenia
      </span>
    </div>
  )
}

/** Mapa mięśni: kolory według liczby serii, stuknięcie przybliża mięsień i pokazuje ćwiczenia. */
export function Miesnie({ id }: { id?: number }) {
  const selected = (id !== undefined && muscleAt(id)?.id) || null
  const days = usePref(RANGE_KEY) === '30' ? 30 : 7
  const [pickedSide, setSide] = useState<Side>(() => (selected ? muscleById(selected).side : 'przod'))
  const data = useTrainingData()

  const calc = useMemo(() => {
    if (!data) return null
    const exercises = new Map(data.exercises.map((e) => [e.id, e]))
    const since = Date.now() - days * DAY
    const recent = new Set(data.workouts.filter((w) => w.startedAt >= since).map((w) => w.id))
    const volume = muscleVolume(
      data.sets.filter((s) => recent.has(s.workoutId)),
      exercises,
    )
    const levels = Object.fromEntries(MUSCLE_LIST.map((m) => [m.id, level(volume[m.id], days)])) as Record<MuscleId, number>
    const workoutAt = new Map(data.workouts.map((w) => [w.id, w.startedAt]))
    return { volume, levels, last: lastByExercise(workoutAt, data.sets, exercises), all: data.exercises }
  }, [data, days])

  // Mięsień widoczny tylko z drugiej strony (np. triceps na widoku z przodu) — mapa sama się obraca.
  const side: Side =
    selected && !isOnSide(selected, pickedSide) ? muscleById(selected).side : pickedSide

  function select(m: MuscleId) {
    // Pierwszy wybór dodaje wpis w historii (Wstecz oddala), kolejne go podmieniają.
    navigate({ name: 'miesnie', id: muscleIndex(m) }, selected !== null)
  }

  const muscle = selected ? muscleById(selected) : null
  const sets = selected && calc ? calc.volume[selected] : 0
  const lists = selected && calc ? exercisesFor(selected, calc.all) : null

  return (
    <div className="pb-6">
      <ScreenTitle>Mięśnie</ScreenTitle>
      <div className="flex items-center justify-between gap-2 px-5 pt-1">
        <Segmented
          label="Widok"
          value={side}
          options={[
            { id: 'przod', label: 'Przód' },
            { id: 'tyl', label: 'Tył' },
          ]}
          onChange={(s) => {
            setSide(s)
            if (selected && !isOnSide(selected, s)) back({ name: 'miesnie' })
          }}
        />
        <Segmented
          label="Zakres"
          value={days}
          options={[
            { id: 7, label: '7 dni' },
            { id: 30, label: '30 dni' },
          ]}
          onChange={(n) => setPref(RANGE_KEY, n === 30 ? '30' : null)}
        />
      </div>

      <div className="relative mx-5 mt-3">
        <BodyMap side={side} levels={calc?.levels ?? ({} as Record<MuscleId, number>)} selected={selected} onSelect={select} style={{ height: muscle ? 'min(40vh, 340px)' : 'min(56vh, 460px)', transition: 'height 420ms ease' }} />
        {muscle && (
          <div className="absolute left-0 top-0">
            <RoundButton label="Cała sylwetka" onClick={() => back({ name: 'miesnie' })}>
              <BackIcon />
            </RoundButton>
          </div>
        )}
      </div>

      {!muscle && <Legend days={days} />}

      {muscle && lists && (
        <>
          <Card className="mx-5 mt-3 flex items-center justify-between gap-3 px-5 py-4">
            <div className="flex min-w-0 flex-col">
              <span className="text-[19px] font-extrabold leading-tight">{muscle.label}</span>
              <span className="text-[13px] text-muted">
                {sets > 0
                  ? `${fmtSets(sets)} ${plural(Math.ceil(sets), 'seria', 'serie', 'serii')} w ostatnich ${days} dniach`
                  : `brak serii w ostatnich ${days} dniach`}
              </span>
            </div>
            <span className="h-9 w-9 shrink-0 rounded-xl" style={{ background: LEVEL_FILL[calc?.levels[muscle.id] ?? 0] }} aria-hidden />
          </Card>
          <ExerciseList title="GŁÓWNIE" items={lists.primary} last={calc!.last} />
          <ExerciseList title="POMOCNICZO" items={lists.secondary} last={calc!.last} />
          <p className="mx-5 mt-4 text-xs leading-relaxed text-muted">
            Seria ćwiczenia, w którym mięsień pracuje pomocniczo, liczy się jako pół serii.
          </p>
        </>
      )}

      {!muscle && calc && (
        <>
          <div className="px-5 pb-2 pt-5 text-[13px] font-bold tracking-wide text-muted">WSZYSTKIE MIĘŚNIE</div>
          <div className="mx-5 overflow-hidden rounded-[20px] border border-line bg-card">
            {MUSCLE_LIST.map((m, i) => (
              <button
                key={m.id}
                onClick={() => {
                  setSide(m.side)
                  select(m.id)
                }}
                className={`flex w-full items-center gap-3 border-0 bg-transparent px-4 py-3 text-left ${
                  i < MUSCLE_LIST.length - 1 ? 'border-b border-solid border-line' : ''
                }`}
              >
                <span className="h-4 w-4 shrink-0 rounded-[5px]" style={{ background: LEVEL_FILL[calc.levels[m.id]] }} aria-hidden />
                <span className="flex-1 text-[15px] font-bold text-ink">{m.label}</span>
                <span className="text-[13px] font-bold text-muted tabular-nums">{fmtSets(calc.volume[m.id])}</span>
                <ChevronIcon />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/** Czy mięsień jest narysowany na danym widoku (boczny akton, przedramiona i łydki — na obu). */
function isOnSide(m: MuscleId, s: Side) {
  return VIEWS[s].muscles.some((x) => x.id === m)
}
