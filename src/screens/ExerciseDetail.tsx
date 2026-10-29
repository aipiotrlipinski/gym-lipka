import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db } from '../db'
import { navigate } from '../router'
import { kg, meters, secs, setLabel, shortDate, thousands } from '../lib/format'
import { exerciseHistory, type SessionPoint } from '../lib/stats'
import { MEASURES, measureOf } from '../lib/measure'
import type { Measure } from '../db'
import { Button, Card, Confirm, Empty, SavedTextField, SectionLabel, TopBar } from '../components/ui'
import { LineChart } from '../components/LineChart'
import { TipsCard } from '../components/Tips'
import { ExercisePhoto } from '../components/ExercisePhoto'
import { NewExerciseSheet, equipmentLabel, muscleLabel } from '../components/exercises'

interface Metric {
  id: string
  label: string
  unit: string
  get: (p: SessionPoint) => number
  /** Wartość na wykresie i w nagłówku (bez jednostki). */
  fmt: (v: number) => string
}
const r1 = (v: number) => kg(Math.round(v * 10) / 10)
const E1RM: Metric = { id: 'e1rm', label: 'Szac. 1RM', unit: 'kg', get: (p) => Math.round(p.e1rm * 10) / 10, fmt: r1 }
const MAX_W: Metric = { id: 'maxWeight', label: 'Maks. ciężar', unit: 'kg', get: (p) => p.maxWeight, fmt: r1 }
const VOLUME: Metric = { id: 'volume', label: 'Objętość', unit: 'kg', get: (p) => p.volume, fmt: thousands }
const KM: Metric = { id: 'distance', label: 'Dystans', unit: 'km', get: (p) => Math.round(p.totalDistance / 10) / 100, fmt: (v) => kg(Math.round(v * 100) / 100) }
const METERS: Metric = { id: 'distance', label: 'Dystans', unit: 'm', get: (p) => p.totalDistance, fmt: thousands }
const MINUTES: Metric = { id: 'time', label: 'Czas', unit: 'min', get: (p) => Math.round(p.totalDuration / 6) / 10, fmt: r1 }
const SPEED: Metric = { id: 'speed', label: 'Prędkość', unit: 'km/h', get: (p) => p.speed, fmt: r1 }
const LONGEST: Metric = { id: 'longest', label: 'Najdłuższa seria', unit: 's', get: (p) => p.maxDuration, fmt: (v) => String(Math.round(v)) }
const TOTAL_S: Metric = { id: 'total', label: 'Łączny czas', unit: 's', get: (p) => p.totalDuration, fmt: (v) => String(Math.round(v)) }

/** Co pokazuje wykres — zależy od sposobu zapisu ćwiczenia. */
const METRICS: Record<Measure, Metric[]> = {
  ciężar: [E1RM, MAX_W, VOLUME],
  czas: [LONGEST, TOTAL_S],
  cardio: [KM, MINUTES, SPEED],
  'ciężar-dystans': [MAX_W, METERS],
}

/** Postęp ćwiczenia: wykres, rekordy, historia serii. */
export function ExerciseDetail({ id }: { id: number }) {
  const exercise = useLiveQuery(() => db.exercises.get(id), [id])
  const history = useLiveQuery(() => exerciseHistory(id), [id])
  const used = useLiveQuery(async () => {
    const inPlans = (await db.planDays.toArray()).some((d) => d.exercises.some((e) => e.exerciseId === id))
    const inSets = (await db.sets.where('exerciseId').equals(id).count()) > 0
    return inPlans || inSets
  }, [id])
  const [metricId, setMetric] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const measure = measureOf(exercise ?? undefined)
  const records = useMemo(() => {
    if (!history?.length) return null
    let maxW = { v: 0, reps: 0, date: 0 }
    let best1 = { v: 0, date: 0 }
    let mostReps = { w: 0, reps: 0, date: 0 }
    for (const p of history)
      for (const s of p.sets) {
        if (!s.done || s.type === 'rozgrzewka') continue
        if (s.weightKg > maxW.v || (s.weightKg === maxW.v && s.reps > maxW.reps)) maxW = { v: s.weightKg, reps: s.reps, date: p.date }
        if (s.reps > mostReps.reps) mostReps = { w: s.weightKg, reps: s.reps, date: p.date }
      }
    for (const p of history) if (p.e1rm > best1.v) best1 = { v: p.e1rm, date: p.date }
    // Na czas i na dystans: najdłuższa seria, najdłuższy dystans, najszybsze tempo.
    let longest = { v: 0, date: 0 }
    let farthest = { v: 0, w: 0, date: 0 }
    let fastest = { v: 0, date: 0 }
    let longestSession = { v: 0, date: 0 }
    for (const p of history) {
      for (const s of p.sets) {
        if (!s.done || s.type === 'rozgrzewka') continue
        if ((s.durationSec ?? 0) > longest.v) longest = { v: s.durationSec!, date: p.date }
        if ((s.distanceM ?? 0) > farthest.v) farthest = { v: s.distanceM!, w: s.weightKg, date: p.date }
      }
      if (p.speed > fastest.v) fastest = { v: p.speed, date: p.date }
      if (p.totalDuration > longestSession.v) longestSession = { v: p.totalDuration, date: p.date }
    }
    return { maxW, best1, mostReps, longest, farthest, fastest, longestSession }
  }, [history])

  if (exercise === undefined || history === undefined) return null
  if (!exercise) return <Empty title="Ćwiczenie nie istnieje" />

  const metrics = METRICS[measure]
  const m = metrics.find((x) => x.id === metricId) ?? metrics[0]
  const points = history.map((p) => ({ x: p.date, y: m.get(p) }))
  const first = points[0]?.y ?? 0
  const lastPt = points[points.length - 1]?.y ?? 0
  const change = lastPt - first
  const weeks = history.length > 1 ? Math.max(1, Math.round((history[history.length - 1].date - history[0].date) / (7 * 864e5))) : 0
  const bodyweight = exercise.equipment === 'masa ciała'

  return (
    <div className="pb-8">
      <TopBar fallback={{ name: 'cwiczenia' }}>
        {muscleLabel(exercise.muscle)} · {equipmentLabel(exercise.equipment)}
      </TopBar>
      <h1 className="m-0 px-5 pb-3 pt-2 text-[26px] font-extrabold leading-tight tracking-tight">{exercise.name}</h1>
      <div className="px-5 pb-3">
        <ExercisePhoto exercise={exercise} />
      </div>
      <div className="px-5 pb-3">
        <SavedTextField
          key={exercise.id}
          label="Stała notatka (widać ją w każdym treningu)"
          value={exercise.note ?? ''}
          onSave={(v) => db.exercises.update(exercise.id, { note: v.trim() || undefined })}
        />
      </div>
      <div className="flex flex-col gap-1.5 px-5 pb-3">
        <span className="text-[13px] font-bold text-muted">Zapis serii</span>
        <div className="flex flex-wrap gap-2">
          {MEASURES.map((x) => (
            <button
              key={x.id}
              aria-pressed={measure === x.id}
              onClick={() => db.exercises.update(exercise.id, { measure: x.id })}
              className={`h-9 rounded-full px-3 text-[13px] ${
                measure === x.id ? 'border-transparent bg-accent font-extrabold text-on-accent' : 'border border-line bg-card font-bold text-ink'
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>
      <TipsCard exercise={exercise} />
      <div className="h-3" />

      {history.length === 0 ? (
        <Empty title="Jeszcze nie robione">Wykres i rekordy pojawią się po pierwszym treningu z tym ćwiczeniem.</Empty>
      ) : (
        <>
          <div
            role="tablist"
            className="mx-5 grid gap-1 rounded-2xl bg-soft p-1"
            style={{ gridTemplateColumns: `repeat(${metrics.length}, minmax(0, 1fr))` }}
          >
            {metrics.map((x) => (
              <button
                key={x.id}
                role="tab"
                aria-selected={m.id === x.id}
                onClick={() => setMetric(x.id)}
                className={`h-10 rounded-xl border-0 text-[13px] ${
                  m.id === x.id ? 'bg-card font-extrabold text-ink' : 'bg-transparent font-bold text-muted'
                }`}
              >
                {x.label}
              </button>
            ))}
          </div>
          <Card className="mx-5 mt-3 flex flex-col gap-1 px-4 pb-3 pt-4">
            <div className="flex flex-wrap items-baseline gap-x-2.5">
              <span className="text-[32px] font-extrabold tracking-tight">
                {m.fmt(lastPt)} {m.unit}
              </span>
              {weeks > 0 && change !== 0 && (
                <span className={`text-sm font-extrabold ${change > 0 ? 'text-accent' : 'text-muted'}`}>
                  {change > 0 ? '+' : ''}
                  {m.fmt(change)} {m.unit} w {weeks} tyg.
                </span>
              )}
            </div>
            <LineChart points={points} unit={m.unit} label={`${m.label}: ${exercise.name}`} />
          </Card>

          {records && (
            <>
              <SectionLabel>REKORDY</SectionLabel>
              <div className="mx-5 grid grid-cols-3 gap-2">
                {measure === 'ciężar' && (
                  <>
                    <Record label="Maks. ciężar" value={bodyweight && records.maxW.v === 0 ? 'MC' : `${kg(records.maxW.v)} kg`} sub={`× ${records.maxW.reps} · ${shortDate(records.maxW.date)}`} />
                    <Record
                      label="Szac. 1RM"
                      value={records.best1.v ? `${kg(Math.round(records.best1.v))} kg` : '—'}
                      sub={records.best1.v ? shortDate(records.best1.date) : 'tylko z obciążeniem'}
                    />
                    <Record label="Najwięcej powt." value={setLabel(records.mostReps.w, records.mostReps.reps)} sub={shortDate(records.mostReps.date)} />
                  </>
                )}
                {measure === 'czas' && (
                  <>
                    <Record label="Najdłuższa seria" value={secs(records.longest.v)} sub={shortDate(records.longest.date)} />
                    <Record label="Łącznie w treningu" value={secs(records.longestSession.v)} sub={shortDate(records.longestSession.date)} />
                  </>
                )}
                {measure === 'cardio' && (
                  <>
                    <Record label="Najdłuższy dystans" value={records.farthest.v ? meters(records.farthest.v) : '—'} sub={records.farthest.v ? shortDate(records.farthest.date) : 'wpisz dystans'} />
                    <Record label="Najdłużej" value={secs(records.longest.v)} sub={shortDate(records.longest.date)} />
                    <Record label="Najszybciej" value={records.fastest.v ? `${kg(records.fastest.v)} km/h` : '—'} sub={records.fastest.v ? shortDate(records.fastest.date) : 'dystans i czas'} />
                  </>
                )}
                {measure === 'ciężar-dystans' && (
                  <>
                    <Record label="Maks. ciężar" value={records.maxW.v === 0 ? 'MC' : `${kg(records.maxW.v)} kg`} sub={shortDate(records.maxW.date)} />
                    <Record label="Najdłuższy dystans" value={meters(records.farthest.v)} sub={`${records.farthest.w ? `${kg(records.farthest.w)} kg · ` : ''}${shortDate(records.farthest.date)}`} />
                  </>
                )}
              </div>
            </>
          )}

          <SectionLabel>HISTORIA · {history.length}</SectionLabel>
          <div className="mx-5 flex flex-col gap-2">
            {[...history].reverse().map((p) => (
              <button
                key={p.workoutId}
                onClick={() => navigate({ name: 'sesja', id: p.workoutId })}
                className="flex flex-col gap-1 rounded-[18px] border border-solid border-line bg-card px-4 py-3 text-left"
              >
                <span className="text-xs font-bold text-muted">{shortDate(p.date)}</span>
                <span className="text-[15px] font-bold tabular-nums text-ink">
                  {p.sets
                    .filter((s) => s.done && s.type !== 'rozgrzewka')
                    .map((s) => setLabel(s.weightKg, s.reps, s.durationSec, s.distanceM))
                    .join('  ·  ')}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {exercise.custom && (
        <div className="mx-5 mt-6 flex flex-col gap-2">
          <Button variant="soft" onClick={() => setEditing(true)}>
            Edytuj ćwiczenie
          </Button>
          {!used && (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Usuń ćwiczenie
            </Button>
          )}
        </div>
      )}
      {editing && <NewExerciseSheet existing={exercise} onClose={() => setEditing(false)} />}
      {confirmDelete && (
        <Confirm
          title="Usunąć ćwiczenie?"
          text={`„${exercise.name}” zniknie z bazy.`}
          confirmLabel="Usuń"
          danger
          onConfirm={async () => {
            await db.exercises.delete(id)
            navigate({ name: 'cwiczenia' }, true)
          }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}

function Record({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="flex flex-col gap-1 !rounded-[18px] p-3">
      <span className="text-[11px] text-muted">{label}</span>
      <span className="text-[17px] font-extrabold">{value}</span>
      <span className="text-[11px] text-muted">{sub}</span>
    </Card>
  )
}
