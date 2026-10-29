import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, type Plan, type PlanDay } from '../db'
import { navigate } from '../router'
import { nextPlanDay, startWorkout } from '../lib/workout'
import { Badge, Button, Card, Confirm, Empty, RoundButton, ScreenTitle, SectionLabel, Stepper, SavedTextField, TopBar } from '../components/ui'
import { ChevronIcon, DownIcon, TrashIcon, UpIcon } from '../components/icons'
import { ExercisePicker, useExercises } from '../components/exercises'
import { ExerciseThumb } from '../components/ExercisePhoto'
import { clock, kg } from '../lib/format'
import { lastWorkingWeight } from '../lib/stats'
import { fieldsOf, measureOf, measureShort } from '../lib/measure'
import { linkedWithNext, removeAt, supersetLabel, swapAt } from '../lib/superset'

function usePlans() {
  return useLiveQuery(async () => {
    const plans = await db.plans.toArray()
    const days = await db.planDays.toArray()
    return plans
      .sort((a, b) => Number(b.active) - Number(a.active) || a.createdAt - b.createdAt)
      .map((p) => ({ plan: p, days: days.filter((d) => d.planId === p.id).sort((a, b) => a.order - b.order) }))
  }, [])
}

/** Obciążenie ćwiczenia w dniu planu (czyta świeży stan, więc szybkie stukanie −/+ niczego nie gubi). */
async function setPlanWeight(dayId: number, index: number, weightKg: number) {
  await db.transaction('rw', db.planDays, async () => {
    const day = await db.planDays.get(dayId)
    if (!day) return
    await db.planDays.update(dayId, { exercises: day.exercises.map((e, j) => (j === index ? { ...e, weightKg } : e)) })
  })
}

/** Ciężary z ostatniego treningu — podpowiedź, gdy w planie nie wpisano obciążenia. */
function useLastWeights(ids: number[]) {
  const key = [...new Set(ids)].sort((a, b) => a - b).join(',')
  return useLiveQuery(async () => {
    const map = new Map<number, number>()
    for (const id of key ? key.split(',').map(Number) : []) {
      const w = await lastWorkingWeight(id)
      if (w !== undefined) map.set(id, w)
    }
    return map
  }, [key])
}

/** Obciążenie w kg z przyciskami −/+ (krok 2,5 kg). */
export function PlanWeight({ value, name, onChange }: { value: number; name: string; onChange: (v: number) => void }) {
  return (
    <Stepper compact accent label={`Obciążenie: ${name}`} value={value} step={2.5} decimal suffix="kg" onChange={(v) => onChange(Math.round(v * 100) / 100)} />
  )
}

async function createPlan() {
  const any = await db.plans.count()
  const id = await db.plans.add({ name: 'Nowy plan', active: any === 0, createdAt: Date.now() } as Plan)
  await db.planDays.add({ planId: id, name: 'Dzień 1', order: 0, exercises: [] })
  navigate({ name: 'plan', id })
}

export function Plany() {
  const data = usePlans()
  const next = useLiveQuery(() => nextPlanDay(), [])
  const exercises = useExercises()
  const nameOf = (id: number) => exercises.find((e) => e.id === id)?.name ?? '?'
  const lastW = useLastWeights(data?.filter((p) => p.plan.active).flatMap((p) => p.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))) ?? [])

  return (
    <div className="pb-6">
      <ScreenTitle
        action={
          <Button variant="outline" onClick={createPlan} className="!rounded-full">
            + Nowy plan
          </Button>
        }
      >
        Plany
      </ScreenTitle>

      {data && data.length === 0 && (
        <Empty title="Nie masz jeszcze planu">Utwórz plan przyciskiem „+ Nowy plan”.</Empty>
      )}

      {data?.map(({ plan, days }) => (
        <Card key={plan.id} className="mx-5 mt-3 flex flex-col gap-2.5 p-4">
          <button
            onClick={() => navigate({ name: 'plan', id: plan.id })}
            className="flex items-center justify-between gap-3 border-0 bg-transparent p-0 text-left"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[19px] font-extrabold text-ink">{plan.name}</span>
              <span className="text-[13px] text-muted">
                {days.length} {days.length === 1 ? 'dzień' : 'dni'} · rotacja
              </span>
            </div>
            {plan.active ? <Badge tone="accent">AKTYWNY</Badge> : <ChevronIcon />}
          </button>
          {plan.active && days.some((d) => d.exercises.length > 0) && (
            <span className="text-[12px] text-muted">Obciążenie wpisujesz tutaj — trening zacznie od tych ciężarów.</span>
          )}
          {plan.active &&
            days.map((d) => {
              const isNext = next?.id === d.id
              return (
                <div
                  key={d.id}
                  className={`flex flex-col rounded-2xl bg-row ${isNext ? 'border-2 border-solid border-accent' : 'border-0'}`}
                >
                  <button
                    onClick={() => navigate({ name: 'dzien', id: d.id })}
                    className="flex items-center gap-3 border-0 bg-transparent px-3.5 py-3 text-left"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[15px] font-bold text-ink">{d.name}</span>
                      {d.exercises.length === 0 && <span className="text-xs text-muted">brak ćwiczeń — stuknij, żeby dodać</span>}
                    </div>
                    {isNext ? (
                      <span className="text-[11px] font-extrabold text-accent">NASTĘPNY</span>
                    ) : (
                      <span className="text-muted">
                        <ChevronIcon />
                      </span>
                    )}
                  </button>
                  {d.exercises.length > 0 && (
                    <div className="flex flex-col gap-1.5 px-2 pb-2">
                      {d.exercises.map((e, i) => {
                        const nm = nameOf(e.exerciseId)
                        const hint = lastW?.get(e.exerciseId)
                        const ms = measureOf(exercises.find((x) => x.id === e.exerciseId))
                        return (
                          <div key={`${e.exerciseId}-${i}`} className="flex items-center gap-2 rounded-xl bg-card py-1 pl-3 pr-1">
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-[13px] font-bold text-ink">{nm}</span>
                              <span className="text-[11px] text-muted">
                                {ms === 'ciężar'
                                  ? `${e.sets} × ${e.repsMin === e.repsMax ? e.repsMin : `${e.repsMin}–${e.repsMax}`}`
                                  : `${e.sets} ${e.sets === 1 ? 'seria' : 'serie'} · ${measureShort(ms)}`}
                                {fieldsOf(ms).weight && e.weightKg === undefined && hint !== undefined ? ` · ostatnio ${kg(hint)} kg` : ''}
                              </span>
                            </div>
                            {fieldsOf(ms).weight && (
                              <div className="w-[132px] shrink-0">
                                <PlanWeight value={e.weightKg ?? hint ?? 0} name={nm} onChange={(v) => setPlanWeight(d.id, i, v)} />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
        </Card>
      ))}
    </div>
  )
}

/** Edycja planu: nazwa, aktywność, kolejność dni. */
export function PlanEdit({ id }: { id: number }) {
  const plan = useLiveQuery(() => db.plans.get(id), [id])
  const days = useLiveQuery(async () => (await db.planDays.where('planId').equals(id).toArray()).sort((a, b) => a.order - b.order), [id])
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (plan === undefined || days === undefined) return null
  if (!plan) return <Empty title="Plan nie istnieje" />

  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= days.length) return
    await db.transaction('rw', db.planDays, async () => {
      await db.planDays.update(days[i].id, { order: j })
      await db.planDays.update(days[j].id, { order: i })
    })
  }

  const addDay = async () => {
    const dayId = await db.planDays.add({ planId: id, name: `Dzień ${days.length + 1}`, order: days.length, exercises: [] })
    navigate({ name: 'dzien', id: dayId })
  }

  const activate = async () => {
    await db.transaction('rw', db.plans, async () => {
      for (const p of await db.plans.toArray()) await db.plans.update(p.id, { active: p.id === id })
    })
  }

  const remove = async () => {
    await db.transaction('rw', db.plans, db.planDays, async () => {
      await db.planDays.where('planId').equals(id).delete()
      await db.plans.delete(id)
    })
    navigate({ name: 'plany' }, true)
  }

  return (
    <div className="pb-8">
      <TopBar fallback={{ name: 'plany' }}>Plan</TopBar>
      <div className="px-5 pt-2">
        <SavedTextField key={id} label="Nazwa planu" value={plan.name} onSave={(v) => db.plans.update(id, { name: v })} />
      </div>
      <div className="mx-5 mt-3">
        {plan.active ? (
          <p className="m-0 text-sm text-muted">To jest aktywny plan — ekran Start podpowiada z niego następny dzień.</p>
        ) : (
          <Button variant="soft" onClick={activate} className="w-full">
            Ustaw jako aktywny
          </Button>
        )}
      </div>

      <SectionLabel>DNI W ROTACJI</SectionLabel>
      <div className="mx-5 flex flex-col gap-2">
        {days.map((d, i) => (
          <Card key={d.id} className="flex items-center gap-2 p-2 pl-4">
            <button
              onClick={() => navigate({ name: 'dzien', id: d.id })}
              className="flex min-w-0 flex-1 flex-col items-start gap-0.5 border-0 bg-transparent py-1 text-left"
            >
              <span className="text-[15px] font-bold text-ink">
                {i + 1}. {d.name}
              </span>
              <span className="text-xs text-muted">{d.exercises.length} ćwiczeń</span>
            </button>
            <RoundButton label={`Przesuń ${d.name} w górę`} onClick={() => move(i, -1)}>
              <UpIcon />
            </RoundButton>
            <RoundButton label={`Przesuń ${d.name} w dół`} onClick={() => move(i, 1)}>
              <DownIcon />
            </RoundButton>
          </Card>
        ))}
        <Button variant="outline" onClick={addDay} className="border-dashed !border-line !text-muted">
          + Dodaj dzień
        </Button>
      </div>

      <div className="mx-5 mt-8">
        <Button variant="danger" onClick={() => setConfirmDelete(true)} className="w-full">
          Usuń plan
        </Button>
      </div>
      {confirmDelete && (
        <Confirm
          title="Usunąć plan?"
          text={`Plan „${plan.name}” i jego dni zostaną usunięte. Historia treningów zostaje.`}
          confirmLabel="Usuń plan"
          danger
          onConfirm={remove}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}

/** Edycja dnia planu: ćwiczenia, serie, zakres powtórzeń, przerwa. */
export function DayEdit({ id }: { id: number }) {
  const day = useLiveQuery(() => db.planDays.get(id), [id])
  const exercises = useExercises()
  const lastW = useLastWeights(day?.exercises.map((e) => e.exerciseId) ?? [])
  const [picker, setPicker] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (day === undefined) return null
  if (!day) return <Empty title="Dzień nie istnieje" />

  const save = (patch: Partial<PlanDay>) => db.planDays.update(id, patch)
  const setEx = (i: number, patch: Partial<PlanDay['exercises'][number]>) =>
    save({ exercises: day.exercises.map((e, j) => (j === i ? { ...e, ...patch } : e)) })
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= day.exercises.length) return
    save({ exercises: swapAt(day.exercises, i, j) })
  }

  const remove = async () => {
    const rest = (await db.planDays.where('planId').equals(day.planId).toArray()).filter((d) => d.id !== id).sort((a, b) => a.order - b.order)
    await db.transaction('rw', db.planDays, async () => {
      await db.planDays.delete(id)
      for (const [i, d] of rest.entries()) await db.planDays.update(d.id, { order: i })
    })
    navigate({ name: 'plan', id: day.planId }, true)
  }

  const start = async () => {
    const wid = await startWorkout(id)
    navigate({ name: 'trening', id: wid })
  }

  return (
    <div className="pb-8">
      <TopBar fallback={{ name: 'plan', id: day.planId }}>Dzień planu</TopBar>
      <div className="px-5 pt-2">
        <SavedTextField key={id} label="Nazwa dnia" value={day.name} onSave={(v) => save({ name: v })} />
      </div>

      <SectionLabel>ĆWICZENIA · {day.exercises.length}</SectionLabel>
      <div className="mx-5 flex flex-col gap-1">
        {day.exercises.some((e) => e.superset) && (
          <p className="m-0 text-[13px] leading-snug text-muted">
            W superserii robisz serię każdego ćwiczenia po kolei, przerwa dopiero po całej rundzie (czas przerwy z ostatniego ćwiczenia).
          </p>
        )}
        {day.exercises.map((e, i) => {
          const ex = exercises.find((x) => x.id === e.exerciseId)
          const lbl = supersetLabel(day.exercises, i)
          const linked = linkedWithNext(day.exercises, i)
          return (
            <div key={`${e.exerciseId}-${i}`} className="flex flex-col">
            <Card className={`flex flex-col gap-3 p-4 ${lbl ? '!border-2 !border-solid !border-accent' : ''}`}>
              <div className="flex items-start gap-2">
                <ExerciseThumb exercise={ex} size="sm" />
                <span className="min-w-0 flex-1 pt-1.5 text-[15px] font-extrabold">
                  {lbl ? <span className="text-accent">{lbl} </span> : `${i + 1}. `}
                  {ex?.name ?? '?'}
                </span>
                <RoundButton label="W górę" onClick={() => move(i, -1)}>
                  <UpIcon />
                </RoundButton>
                <RoundButton label="W dół" onClick={() => move(i, 1)}>
                  <DownIcon />
                </RoundButton>
                <RoundButton label="Usuń z dnia" onClick={() => save({ exercises: removeAt(day.exercises, (_, j) => j === i) })}>
                  <TrashIcon />
                </RoundButton>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {fieldsOf(measureOf(ex)).weight && (
                <div className="col-span-2 flex flex-col gap-1 text-xs font-bold text-accent">
                  Obciążenie
                  {e.weightKg === undefined && lastW?.get(e.exerciseId) !== undefined ? ` · ostatnio ${kg(lastW.get(e.exerciseId)!)} kg` : ''}
                  <Stepper
                    accent
                    label="Obciążenie"
                    value={e.weightKg ?? lastW?.get(e.exerciseId) ?? 0}
                    step={2.5}
                    decimal
                    suffix="kg"
                    onChange={(v) => setPlanWeight(id, i, Math.round(v * 100) / 100)}
                  />
                </div>
                )}
                <div className="flex flex-col gap-1 text-xs font-bold text-muted">
                  Serie
                  <Stepper label="Serie" value={e.sets} step={1} min={1} onChange={(v) => setEx(i, { sets: Math.round(v) })} />
                </div>
                <div className="flex flex-col gap-1 text-xs font-bold text-muted">
                  Przerwa · {clock(e.restSec)}
                  <Stepper label="Przerwa w sekundach" value={e.restSec} step={15} min={0} suffix="s" onChange={(v) => setEx(i, { restSec: Math.round(v) })} />
                </div>
                {measureOf(ex) === 'ciężar' ? (
                <>
                <div className="flex flex-col gap-1 text-xs font-bold text-muted">
                  Powtórzenia od
                  <Stepper label="Powtórzenia od" value={e.repsMin} step={1} min={1} onChange={(v) => setEx(i, { repsMin: Math.round(v), repsMax: Math.max(Math.round(v), e.repsMax) })} />
                </div>
                <div className="flex flex-col gap-1 text-xs font-bold text-muted">
                  do
                  <Stepper label="Powtórzenia do" value={e.repsMax} step={1} min={1} onChange={(v) => setEx(i, { repsMax: Math.round(v), repsMin: Math.min(Math.round(v), e.repsMin) })} />
                </div>
                </>
                ) : (
                  <p className="col-span-2 m-0 text-xs leading-snug text-muted">
                    {{ czas: 'Czas serii', cardio: 'Dystans i czas', 'ciężar-dystans': 'Ciężar i dystans', ciężar: '' }[measureOf(ex)]} wpisujesz w treningu — podpowie się z ostatniego razu.
                  </p>
                )}
              </div>
            </Card>
            {i < day.exercises.length - 1 && (
              <button
                onClick={() => setEx(i, { superset: linked ? undefined : true })}
                aria-pressed={linked}
                className={`mx-auto my-1 flex h-8 items-center gap-1.5 rounded-full border-0 px-3 text-xs font-extrabold ${
                  linked ? 'bg-accent text-on-accent' : 'bg-transparent text-muted'
                }`}
              >
                {linked ? '⇅ Superseria · stuknij, aby rozłączyć' : '+ połącz w superserię'}
              </button>
            )}
            </div>
          )
        })}
        <Button variant="outline" onClick={() => setPicker(true)} className="border-dashed !border-line !text-muted">
          + Dodaj ćwiczenie
        </Button>
      </div>

      <div className="mx-5 mt-6 flex flex-col gap-2">
        <Button size="lg" onClick={start} disabled={day.exercises.length === 0}>
          Rozpocznij ten trening
        </Button>
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>
          Usuń dzień
        </Button>
      </div>

      {picker && (
        <ExercisePicker
          title="Dodaj ćwiczenie"
          exclude={day.exercises.map((e) => e.exerciseId)}
          onClose={() => setPicker(false)}
          onPick={(ex) =>
            save({ exercises: [...day.exercises, { exerciseId: ex.id, sets: 3, repsMin: 8, repsMax: 12, restSec: 90 }] })
          }
        />
      )}
      {confirmDelete && (
        <Confirm
          title="Usunąć dzień?"
          text={`Dzień „${day.name}” zniknie z planu. Historia treningów zostaje.`}
          confirmLabel="Usuń dzień"
          danger
          onConfirm={remove}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
