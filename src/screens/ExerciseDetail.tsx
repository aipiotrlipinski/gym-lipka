import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db } from '../db'
import { navigate } from '../router'
import { kg, setLabel, shortDate, thousands } from '../lib/format'
import { exerciseHistory } from '../lib/stats'
import { Button, Card, Confirm, Empty, SectionLabel, TopBar } from '../components/ui'
import { LineChart } from '../components/LineChart'
import { TipsCard } from '../components/Tips'
import { ExercisePhoto } from '../components/ExercisePhoto'
import { NewExerciseSheet, equipmentLabel, muscleLabel } from '../components/exercises'

type Metric = 'e1rm' | 'maxWeight' | 'volume'
const METRICS: { id: Metric; label: string; unit: string }[] = [
  { id: 'e1rm', label: 'Szac. 1RM', unit: 'kg' },
  { id: 'maxWeight', label: 'Maks. ciężar', unit: 'kg' },
  { id: 'volume', label: 'Objętość', unit: 'kg' },
]

/** Postęp ćwiczenia: wykres, rekordy, historia serii. */
export function ExerciseDetail({ id }: { id: number }) {
  const exercise = useLiveQuery(() => db.exercises.get(id), [id])
  const history = useLiveQuery(() => exerciseHistory(id), [id])
  const used = useLiveQuery(async () => {
    const inPlans = (await db.planDays.toArray()).some((d) => d.exercises.some((e) => e.exerciseId === id))
    const inSets = (await db.sets.where('exerciseId').equals(id).count()) > 0
    return inPlans || inSets
  }, [id])
  const [metric, setMetric] = useState<Metric>('e1rm')
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

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
    return { maxW, best1, mostReps }
  }, [history])

  if (exercise === undefined || history === undefined) return null
  if (!exercise) return <Empty title="Ćwiczenie nie istnieje" />

  const m = METRICS.find((x) => x.id === metric)!
  const points = history.map((p) => ({ x: p.date, y: metric === 'e1rm' ? Math.round(p.e1rm * 10) / 10 : p[metric] }))
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
      {exercise.note && <p className="mx-5 mb-3 mt-0 text-sm text-muted">Notatka: {exercise.note}</p>}
      <TipsCard exercise={exercise} />
      <div className="h-3" />

      {history.length === 0 ? (
        <Empty title="Jeszcze nie robione">Wykres i rekordy pojawią się po pierwszym treningu z tym ćwiczeniem.</Empty>
      ) : (
        <>
          <div role="tablist" className="mx-5 grid grid-cols-3 gap-1 rounded-2xl bg-soft p-1">
            {METRICS.map((x) => (
              <button
                key={x.id}
                role="tab"
                aria-selected={metric === x.id}
                onClick={() => setMetric(x.id)}
                className={`h-10 rounded-xl border-0 text-[13px] ${
                  metric === x.id ? 'bg-card font-extrabold text-ink' : 'bg-transparent font-bold text-muted'
                }`}
              >
                {x.label}
              </button>
            ))}
          </div>
          <Card className="mx-5 mt-3 flex flex-col gap-1 px-4 pb-3 pt-4">
            <div className="flex flex-wrap items-baseline gap-x-2.5">
              <span className="text-[32px] font-extrabold tracking-tight">
                {metric === 'volume' ? thousands(lastPt) : kg(Math.round(lastPt * 10) / 10)} {m.unit}
              </span>
              {weeks > 0 && change !== 0 && (
                <span className={`text-sm font-extrabold ${change > 0 ? 'text-accent' : 'text-muted'}`}>
                  {change > 0 ? '+' : ''}
                  {metric === 'volume' ? thousands(change) : kg(Math.round(change * 10) / 10)} kg w {weeks} tyg.
                </span>
              )}
            </div>
            <LineChart points={points} unit={m.unit} label={`${m.label}: ${exercise.name}`} />
          </Card>

          {records && (
            <>
              <SectionLabel>REKORDY</SectionLabel>
              <div className="mx-5 grid grid-cols-3 gap-2">
                <Card className="flex flex-col gap-1 !rounded-[18px] p-3">
                  <span className="text-[11px] text-muted">Maks. ciężar</span>
                  <span className="text-[17px] font-extrabold">{bodyweight && records.maxW.v === 0 ? 'MC' : `${kg(records.maxW.v)} kg`}</span>
                  <span className="text-[11px] text-muted">
                    × {records.maxW.reps} · {shortDate(records.maxW.date)}
                  </span>
                </Card>
                <Card className="flex flex-col gap-1 !rounded-[18px] p-3">
                  <span className="text-[11px] text-muted">Szac. 1RM</span>
                  <span className="text-[17px] font-extrabold">{records.best1.v ? `${kg(Math.round(records.best1.v))} kg` : '—'}</span>
                  <span className="text-[11px] text-muted">{records.best1.v ? shortDate(records.best1.date) : 'tylko z obciążeniem'}</span>
                </Card>
                <Card className="flex flex-col gap-1 !rounded-[18px] p-3">
                  <span className="text-[11px] text-muted">Najwięcej powt.</span>
                  <span className="text-[17px] font-extrabold">{setLabel(records.mostReps.w, records.mostReps.reps)}</span>
                  <span className="text-[11px] text-muted">{shortDate(records.mostReps.date)}</span>
                </Card>
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
                    .map((s) => setLabel(s.weightKg, s.reps, s.durationSec))
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
