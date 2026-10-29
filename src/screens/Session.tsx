import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../db'
import { supersetLabel } from '../lib/superset'
import { navigate } from '../router'
import { duration, longDate, setLabel, thousands, volume } from '../lib/format'
import { workoutPRs } from '../lib/stats'
import { weightAt, workoutKcal } from '../lib/kcal'
import { deleteWorkout, setsOf } from '../lib/workout'
import { Badge, Button, Card, Confirm, Empty, SectionLabel, TopBar } from '../components/ui'
import { useExercises } from '../components/exercises'

/**
 * Szczegóły zakończonego treningu. `fresh` = ekran podsumowania zaraz po treningu.
 */
export function Session({ id, fresh = false }: { id: number; fresh?: boolean }) {
  const workout = useLiveQuery(() => db.workouts.get(id), [id])
  const sets = useLiveQuery(() => setsOf(id), [id])
  const prs = useLiveQuery(() => workoutPRs(id), [id, sets?.length])
  const body = useLiveQuery(() => db.body.toArray(), [])
  const exercises = useExercises()
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (workout === undefined || sets === undefined) return null
  if (!workout) return <Empty title="Ten trening nie istnieje" />

  const done = sets.filter((s) => s.done)
  const name = (eid: number) => exercises.find((e) => e.id === eid)?.name ?? '?'
  const time = (workout.endedAt ?? Date.now()) - workout.startedAt
  const kcal = workout.endedAt ? workoutKcal(time, weightAt(body ?? [], workout.startedAt)) : undefined
  const stats = [
    { label: 'Czas', value: duration(time) },
    { label: 'Objętość', value: `${thousands(volume(sets))} kg` },
    { label: 'Serie', value: String(done.filter((s) => s.type !== 'rozgrzewka').length) },
    { label: 'Kalorie (szacunek)', value: kcal !== undefined ? `~${thousands(kcal)} kcal` : '—' },
  ]

  return (
    <div className="pb-8">
      {fresh ? (
        <div className="px-5 pb-2 pt-8">
          <span className="text-[13px] font-bold tracking-wide text-accent">TRENING ZAPISANY</span>
          <h1 className="m-0 mt-1 text-[30px] font-extrabold tracking-tight">Dobra robota!</h1>
          <p className="m-0 mt-1 text-sm text-muted">
            {workout.name} · {longDate(workout.startedAt)}
          </p>
        </div>
      ) : (
        <>
          <TopBar fallback={{ name: 'historia' }}>{longDate(workout.startedAt)}</TopBar>
          <h1 className="m-0 px-5 pt-2 text-[28px] font-extrabold tracking-tight">{workout.name}</h1>
        </>
      )}

      <div className="mx-5 mt-4 grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <Card key={s.label} className="flex flex-col gap-1 !rounded-[18px] p-3">
            <span className="text-[11px] text-muted">{s.label}</span>
            <span className="text-[17px] font-extrabold">{s.value}</span>
          </Card>
        ))}
      </div>
      {kcal === undefined && workout.endedAt && body && body.length === 0 && (
        <button
          onClick={() => navigate({ name: 'historia' })}
          className="mx-5 mt-2 w-[calc(100%-2.5rem)] rounded-2xl border-0 bg-soft px-4 py-3 text-left text-[13px] text-muted"
        >
          Żeby policzyć kalorie, wpisz masę ciała w Historii → Masa ciała.
        </button>
      )}

      {prs && prs.length > 0 && (
        <>
          <SectionLabel>REKORDY · {prs.length}</SectionLabel>
          <Card className="mx-5 flex flex-col p-1.5">
            {prs.map((p) => (
              <button
                key={p.exerciseId}
                onClick={() => navigate({ name: 'cwiczenie', id: p.exerciseId })}
                className="flex items-center justify-between gap-3 rounded-2xl border-0 bg-transparent px-3 py-2.5 text-left"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-[15px] font-bold text-ink">{name(p.exerciseId)}</span>
                  <span className="text-xs text-muted">{setLabel(p.set.weightKg, p.set.reps, p.set.durationSec, p.set.distanceM)}</span>
                </div>
                <Badge>{p.label}</Badge>
              </button>
            ))}
          </Card>
        </>
      )}

      {workout.note && (
        <p className="mx-5 mt-4 rounded-2xl bg-soft px-4 py-3 text-sm text-ink">Notatka: {workout.note}</p>
      )}

      <SectionLabel>ĆWICZENIA</SectionLabel>
      <div className="mx-5 flex flex-col gap-2">
        {workout.items.map((it, j) => {
          const lbl = supersetLabel(workout.items, j)
          const ss = done.filter((s) => s.exerciseId === it.exerciseId)
          if (ss.length === 0) return null
          return (
            <button
              key={it.exerciseId}
              onClick={() => navigate({ name: 'cwiczenie', id: it.exerciseId })}
              className="flex flex-col gap-1.5 rounded-[20px] border border-solid border-line bg-card px-4 py-3 text-left"
            >
              <span className="text-[15px] font-extrabold text-ink">
                {lbl && <span className="text-accent">{lbl} </span>}
                {name(it.exerciseId)}
              </span>
              <span className="text-[13px] tabular-nums text-muted">
                {ss.map((s) => (s.type === 'rozgrzewka' ? `(${setLabel(s.weightKg, s.reps, s.durationSec, s.distanceM)})` : setLabel(s.weightKg, s.reps, s.durationSec, s.distanceM))).join('  ·  ')}
              </span>
              {it.note && <span className="text-xs text-muted">Notatka: {it.note}</span>}
            </button>
          )
        })}
      </div>

      <div className="mx-5 mt-6 flex flex-col gap-2">
        {fresh ? (
          <Button size="lg" onClick={() => navigate({ name: 'start' }, true)}>
            Gotowe
          </Button>
        ) : (
          <>
            <Button variant="soft" onClick={() => navigate({ name: 'trening', id })}>
              Edytuj serie
            </Button>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Usuń trening
            </Button>
          </>
        )}
      </div>
      {confirmDelete && (
        <Confirm
          title="Usunąć trening?"
          text="Trening i wszystkie jego serie znikną z historii i wykresów. Tego nie da się cofnąć."
          confirmLabel="Usuń trening"
          danger
          onConfirm={async () => {
            await deleteWorkout(id)
            navigate({ name: 'historia' }, true)
          }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
