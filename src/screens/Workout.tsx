import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { db, type Exercise, type WorkoutSet } from '../db'
import { back, navigate } from '../router'
import { clock, kg, plural, setLabel, setLabelAs, shortDate } from '../lib/format'
import { fieldsOf, measureOf } from '../lib/measure'
import { exerciseBests, lastExerciseComment, lastSessionSets, livePRs } from '../lib/stats'
import { suggest } from '../lib/progress'
import { rest, unlockAudio, useNow, useRest, useWakeLock } from '../lib/rest'
import {
  addExercise,
  addSet,
  cycleType,
  deleteWorkout,
  finishWorkout,
  removeExercise,
  setsOf,
  swapExercise,
  toggleSuperset,
} from '../lib/workout'
import { afterSet, groupOf, linkedWithNext, supersetLabel } from '../lib/superset'
import { useSwipe } from '../components/useSwipe'
import { Badge, Button, Card, Confirm, Empty, RoundButton, Sheet, Stepper, TextField } from '../components/ui'
import { BackIcon, CheckIcon, CloseIcon, ListBulletIcon } from '../components/icons'
import { ExercisePicker, useExercises } from '../components/exercises'
import { TipsToggle } from '../components/Tips'
import { ExerciseThumb, PhotoSheet } from '../components/ExercisePhoto'
import { exerciseImage } from '../lib/exerciseImage'
import { syncWorkoutToHealth } from '../lib/health'
import { SET_DONE_EVENT, setFocusExercise } from '../lib/lockscreen'

const TYPE_SHORT = { rozgrzewka: 'R', robocza: '', drop: 'D' } as const
const TYPE_LABEL = { rozgrzewka: 'Rozgrzewkowa', robocza: 'Robocza', drop: 'Drop set' } as const

export function Workout({ id }: { id: number }) {
  const workout = useLiveQuery(() => db.workouts.get(id), [id])
  const allSets = useLiveQuery(() => setsOf(id), [id])
  const exercises = useExercises()
  const live = workout?.status === 'trwa'
  useWakeLock(live)
  const now = useNow(live ? 1000 : 0)
  const restState = useRest()

  const [idx, setIdx] = useState<number | null>(null)
  const [editingSet, setEditingSet] = useState<number | null>(null)
  const [sheet, setSheet] = useState<null | 'list' | 'add' | 'menu' | 'swap' | 'finish' | 'discard' | 'photo' | 'comment'>(null)
  const [swapPermanent, setSwapPermanent] = useState(false)
  /** Ćwiczenie, do którego piszemy komentarz (bieżące albo właśnie skończone). */
  const [commentFor, setCommentFor] = useState<number | null>(null)
  /** Ćwiczenie skończone przed chwilą — na następnym ekranie pasek „dodaj komentarz”. */
  const [justDone, setJustDone] = useState<number | null>(null)

  const items = workout?.items ?? []

  // Bieżące ćwiczenie: pierwsze z niezaliczonymi seriami (przy wejściu na ekran).
  useEffect(() => {
    if (idx !== null || !workout || !allSets) return
    const first = workout.items.findIndex((it) => allSets.some((s) => s.exerciseId === it.exerciseId && !s.done))
    setIdx(first >= 0 ? first : 0)
  }, [idx, workout, allSets])

  const cur = items[Math.min(idx ?? 0, Math.max(0, items.length - 1))]

  // Ekran blokady pokazuje ćwiczenie otwarte tutaj.
  useEffect(() => {
    if (live) setFocusExercise(cur?.exerciseId)
    return () => setFocusExercise(undefined)
  }, [live, cur?.exerciseId])

  // Ostatnia seria zaliczona z ekranu blokady → przejście do następnego niedokończonego ćwiczenia.
  const [doneOutside, setDoneOutside] = useState<{ exerciseId: number; nextExerciseId?: number } | null>(null)
  useEffect(() => {
    const on = (e: Event) => setDoneOutside((e as CustomEvent<{ exerciseId: number; nextExerciseId?: number }>).detail)
    window.addEventListener(SET_DONE_EVENT, on)
    return () => window.removeEventListener(SET_DONE_EVENT, on)
  }, [])
  useEffect(() => {
    if (doneOutside === null || !workout) return
    setDoneOutside(null)
    if (doneOutside.exerciseId !== cur?.exerciseId) return
    // Następne ćwiczenie wybiera ekran blokady (w superserii — kolejne z rundy).
    const nxt = workout.items.findIndex((it) => it.exerciseId === doneOutside.nextExerciseId)
    if (nxt >= 0) setIdx(nxt)
  }, [doneOutside, workout, cur?.exerciseId])
  const exercise = exercises.find((e) => e.id === cur?.exerciseId)
  const sets = useMemo(() => (allSets ?? []).filter((s) => s.exerciseId === cur?.exerciseId), [allSets, cur?.exerciseId])

  const prev = useLiveQuery(async () => (cur ? lastSessionSets(cur.exerciseId, id) : []), [cur?.exerciseId, id])
  const lastComment = useLiveQuery(async () => (cur ? lastExerciseComment(cur.exerciseId, id) : undefined), [cur?.exerciseId, id])
  const bests = useLiveQuery(
    async () => (cur ? exerciseBests(cur.exerciseId, id, workout?.startedAt) : undefined),
    [cur?.exerciseId, id, workout?.startedAt],
  )
  const prs = useMemo(() => livePRs(sets, bests), [sets, bests])
  const suggestion = useMemo(() => (prev ? suggest(exercise, cur, prev) : null), [prev, exercise, cur])
  const [hiddenTip, setHiddenTip] = useState<number | null>(null)

  const at = Math.min(idx ?? 0, Math.max(0, items.length - 1))
  const goTo = (j: number) => {
    setIdx(j)
    setEditingSet(null)
  }
  const swipe = useSwipe({
    canPrev: at > 0,
    canNext: at < items.length - 1,
    onPrev: () => goTo(at - 1),
    onNext: () => goTo(at + 1),
  })

  if (workout === undefined || allSets === undefined) return null
  if (!workout) return <Empty title="Ten trening już nie istnieje" />

  const i = Math.min(idx ?? 0, Math.max(0, items.length - 1))
  const activeSetId = editingSet ?? sets.find((s) => !s.done)?.id
  const nextItem = items[i + 1]
  const nextEx = exercises.find((e) => e.id === nextItem?.exerciseId)
  const nextCount = (allSets ?? []).filter((s) => s.exerciseId === nextItem?.exerciseId).length
  const name = (eid: number) => exercises.find((e) => e.id === eid)?.name ?? '?'

  /**
   * Zmiana ciężaru/powtórzeń w niezaliczonej serii przechodzi też na kolejne niezaliczone serie
   * tego samego typu — wpisujesz raz, a nie w każdej serii od zera.
   */
  const updateForward = async (s: WorkoutSet, patch: SetPatch) => {
    const targets = s.done ? [s] : sets.filter((x) => x.order >= s.order && !x.done && x.type === s.type)
    await db.transaction('rw', db.sets, async () => {
      for (const t of targets) await db.sets.update(t.id, patch)
    })
  }

  const workDone = sets.some((x) => x.done && x.type !== 'rozgrzewka')
  const undoneWork = sets.filter((x) => !x.done && x.type === 'robocza')
  const showSuggestion =
    live &&
    !workDone &&
    suggestion !== null &&
    hiddenTip !== cur?.exerciseId &&
    undoneWork.some((x) => x.weightKg !== suggestion.weightKg || x.reps !== suggestion.reps)
  const measure = measureOf(exercise)
  const firstTime =
    live && fieldsOf(measure).weight && prev !== undefined && prev.length === 0 && !workDone && undoneWork.every((x) => x.weightKg === 0)

  const applySuggestion = async () => {
    if (!suggestion) return
    await db.transaction('rw', db.sets, async () => {
      for (const t of undoneWork) await db.sets.update(t.id, { weightKg: suggestion.weightKg, reps: suggestion.reps })
    })
  }

  const complete = async (s: WorkoutSet) => {
    unlockAudio()
    const wasEditing = editingSet !== null
    await db.sets.update(s.id, { done: true })
    setEditingSet(null)
    if (!live || wasEditing) return
    // Zwykłe ćwiczenie: przerwa, a po ostatniej serii — następne niedokończone.
    // Superseria: od razu następne ćwiczenie z rundy, przerwa dopiero po całej rundzie.
    const after = allSets.map((x) => (x.id === s.id ? { ...x, done: true } : x))
    // Ostatnia seria ćwiczenia → zaproponuj komentarz na następny raz.
    setJustDone(after.some((x) => x.exerciseId === cur.exerciseId && !x.done) ? null : cur.exerciseId)
    const next = afterSet(items, after, i)
    if (next.rest) {
      if (cur.restSec > 0) rest.start(cur.restSec, exercise?.name ?? '')
    } else if (next.goTo !== null) rest.stop()
    if (next.goTo !== null && next.goTo !== i) setIdx(next.goTo)
  }

  const openComment = (exerciseId: number) => {
    setCommentFor(exerciseId)
    setSheet('comment')
  }
  const saveComment = (exerciseId: number, note: string) =>
    db.workouts.update(id, {
      items: items.map((it) => (it.exerciseId === exerciseId ? { ...it, note: note.trim() || undefined } : it)),
    })
  const doneItem = justDone !== null && justDone !== cur?.exerciseId ? items.find((it) => it.exerciseId === justDone) : undefined

  const finish = async () => {
    rest.stop()
    await finishWorkout(id)
    // W APK trening trafia też do Health Connect / Google Fit (w tle, bez czekania).
    syncWorkoutToHealth(id)
    navigate({ name: 'podsumowanie', id }, true)
  }

  const [ga, gb] = groupOf(items, i)
  const ssLabel = supersetLabel(items, i)
  const partners = ga < gb ? items.slice(ga, gb + 1).filter((_, k) => ga + k !== i).map((it) => name(it.exerciseId)) : []

  const elapsed = live ? (now - workout.startedAt) / 1000 : ((workout.endedAt ?? workout.startedAt) - workout.startedAt) / 1000
  const undoneCount = allSets.filter((s) => !s.done).length

  return (
    <div className="flex min-h-full flex-col overflow-x-clip">
      {/* Pasek górny */}
      <div className="flex items-center justify-between px-5 pb-2 pt-5">
        <RoundButton label="Wstecz" onClick={() => back({ name: 'start' })}>
          <BackIcon />
        </RoundButton>
        <span className="text-sm tabular-nums text-muted">{clock(elapsed)}</span>
        {live ? (
          <Button variant="outline" onClick={() => setSheet('finish')} className="!rounded-full">
            Zakończ
          </Button>
        ) : (
          <Button variant="outline" onClick={() => back({ name: 'sesja', id })} className="!rounded-full">
            Gotowe
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Empty title="Pusty trening">
          Dodaj pierwsze ćwiczenie.
          <Button className="mt-3 w-full" onClick={() => setSheet('add')}>
            + Dodaj ćwiczenie
          </Button>
        </Empty>
      ) : (
        <div {...swipe.handlers} style={swipe.style}>
          {/* Nagłówek ćwiczenia — przesunięcie palcem w bok zmienia ćwiczenie */}
          <div className="flex items-start gap-3 px-5 pb-3 pt-2">
            {exerciseImage(exercise) && (
              <button
                onClick={() => setSheet('photo')}
                aria-label="Pokaż zdjęcie ćwiczenia"
                className="mt-1 shrink-0 border-0 bg-transparent p-0"
              >
                <ExerciseThumb exercise={exercise} size="lg" />
              </button>
            )}
            <button
              onClick={() => setSheet('menu')}
              className="flex min-w-0 flex-1 flex-col items-start gap-1 border-0 bg-transparent p-0 text-left"
            >
              <span className="text-[13px] font-bold tracking-wide text-accent">
                {workout.name.toUpperCase()} · ĆWICZENIE {i + 1} Z {items.length}
              </span>
              <span className="text-[26px] font-extrabold leading-tight tracking-tight text-ink">{exercise?.name ?? '…'}</span>
              {ssLabel && (
                <span className="text-[13px] font-bold text-accent">
                  Superseria {ssLabel} · z: {partners.join(', ')}
                </span>
              )}
            </button>
            <RoundButton label="Lista ćwiczeń" onClick={() => setSheet('list')}>
              <ListBulletIcon />
            </RoundButton>
          </div>

          {doneItem && !doneItem.note && (
            <div className="mx-5 mb-3 flex items-center gap-2 rounded-2xl border border-solid border-accent bg-card py-1.5 pl-4 pr-1.5">
              <button
                onClick={() => openComment(doneItem.exerciseId)}
                className="flex min-w-0 flex-1 flex-col items-start gap-0.5 border-0 bg-transparent p-0 py-1 text-left"
              >
                <span className="w-full truncate text-[13px] text-muted">✓ {name(doneItem.exerciseId)} — skończone</span>
                <span className="text-[14px] font-extrabold text-accent">💬 Dodaj komentarz na następny raz</span>
              </button>
              <button
                onClick={() => setJustDone(null)}
                aria-label="Bez komentarza"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-muted"
              >
                <CloseIcon size={16} />
              </button>
            </div>
          )}

          {lastComment && (
            <button
              onClick={() => openComment(cur.exerciseId)}
              className="mx-5 mb-3 flex w-[calc(100%-40px)] flex-col gap-0.5 rounded-2xl border-0 border-l-4 border-solid border-accent bg-soft px-4 py-2.5 text-left text-[14px] leading-snug text-ink"
            >
              <span className="text-[11px] font-extrabold tracking-wide text-accent">
                💬 KOMENTARZ Z OSTATNIEGO RAZU · {shortDate(lastComment.date)}
              </span>
              <span>{lastComment.note}</span>
            </button>
          )}

          {exercise?.note && (
            <button
              onClick={() => setSheet('menu')}
              className="mx-5 mb-3 flex w-[calc(100%-40px)] flex-col gap-1 rounded-2xl border-0 bg-soft px-4 py-2.5 text-left text-[13px] leading-snug text-ink"
            >
              <span>
                <span className="font-extrabold">Notatka: </span>
                {exercise.note}
              </span>
            </button>
          )}

          <TipsToggle key={cur.exerciseId} exercise={exercise} />

          {showSuggestion && suggestion && (
            <div className="mx-5 mb-3 flex flex-col gap-2 rounded-[20px] border-2 border-solid border-accent bg-card px-4 py-3.5">
              <span className="text-xs font-bold tracking-wide text-accent">
                {suggestion.kind === 'ciężar' ? 'CZAS NA PROGRES' : 'CEL NA DZIŚ'}
              </span>
              <span className="text-[17px] font-extrabold leading-snug">{suggestion.title}</span>
              <span className="text-[13px] leading-snug text-muted">{suggestion.reason}</span>
              <div className="mt-1 flex gap-2">
                <Button onClick={applySuggestion} className="flex-1">
                  Zastosuj do serii
                </Button>
                <Button variant="ghost" onClick={() => setHiddenTip(cur.exerciseId)}>
                  Nie teraz
                </Button>
              </div>
            </div>
          )}
          {firstTime && (
            <p className="mx-5 mb-3 mt-0 rounded-2xl bg-soft px-4 py-3 text-[13px] leading-snug text-ink">
              Pierwszy raz to ćwiczenie: wpisz ciężar w pierwszej serii — kolejne serie przejmą go automatycznie. Od następnego
              treningu wszystko podpowie się samo.
            </p>
          )}

          {/* Serie */}
          <Card className="mx-5 flex flex-col gap-2 p-3.5">
            {sets.map((s, n) => {
              const p = prev?.[n]
              const pr = prs.get(s.id)
              if (s.id === activeSetId)
                return (
                  <ActiveSet
                    key={s.id}
                    set={s}
                    number={sets.filter((x, k) => k <= n && x.type !== 'rozgrzewka').length}
                    prevLabel={p ? setLabel(p.weightKg, p.reps, p.durationSec, p.distanceM) : undefined}
                    repsHint={cur.repsMin && measure === 'ciężar' ? `${cur.repsMin}–${cur.repsMax}` : undefined}
                    editing={s.done}
                    exercise={exercise}
                    onComplete={() => complete(s)}
                    onChange={(patch) => updateForward(s, patch)}
                    onUndo={async () => {
                      await db.sets.update(s.id, { done: false })
                      setEditingSet(null)
                    }}
                    onDelete={async () => {
                      await db.sets.delete(s.id)
                      setEditingSet(null)
                    }}
                    onCancel={editingSet !== null ? () => setEditingSet(null) : undefined}
                  />
                )
              const workN = sets.filter((x, k) => k <= n && x.type !== 'rozgrzewka').length
              return (
                <button
                  key={s.id}
                  onClick={() => setEditingSet(s.id)}
                  className={`flex items-center gap-3 rounded-2xl border-0 bg-row px-3 py-2.5 text-left ${s.done ? 'text-ink' : 'text-muted'}`}
                >
                  <span
                    className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
                      s.done ? (s.type === 'rozgrzewka' ? 'bg-muted text-card' : 'bg-accent text-on-accent') : 'bg-soft text-muted'
                    }`}
                  >
                    {s.done ? <CheckIcon size={14} /> : TYPE_SHORT[s.type] || workN}
                  </span>
                  <span className={`flex-1 text-base tabular-nums ${s.done ? 'font-extrabold' : 'font-semibold'}`}>
                    {measure === 'ciężar' ? `${s.weightKg === 0 ? 'MC' : `${kg(s.weightKg)} kg`} × ${s.reps}` : setLabelAs(measure, s)}
                  </span>
                  {pr ? (
                    <Badge>{pr}</Badge>
                  ) : s.type === 'rozgrzewka' ? (
                    <span className="text-xs text-muted">rozgrzewka</span>
                  ) : s.type === 'drop' ? (
                    <span className="text-xs text-muted">drop set</span>
                  ) : p ? (
                    <span className="text-xs text-muted">było {setLabel(p.weightKg, p.reps, p.durationSec, p.distanceM)}</span>
                  ) : null}
                </button>
              )
            })}
            <Button variant="ghost" size="sm" onClick={() => addSet(id, cur.exerciseId)} className="self-center">
              + Dodaj serię
            </Button>
          </Card>

          {/* Komentarz do ćwiczenia — pokaże się przy następnym treningu z tym ćwiczeniem */}
          {cur.note ? (
            <button
              onClick={() => openComment(cur.exerciseId)}
              className="mx-5 mt-3 flex w-[calc(100%-40px)] flex-col gap-0.5 rounded-2xl border border-solid border-line bg-card px-4 py-2.5 text-left text-[14px] leading-snug text-ink"
            >
              <span className="text-[11px] font-extrabold tracking-wide text-muted">💬 TWÓJ KOMENTARZ NA NASTĘPNY RAZ</span>
              <span>{cur.note}</span>
            </button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => openComment(cur.exerciseId)} className="mx-5 mt-2">
              💬 Dodaj komentarz na następny raz
            </Button>
          )}
        </div>
      )}

      <div className="flex-1" />

      {/* Timer przerwy i następne ćwiczenie */}
      {live && restState && (
        <div className="mx-5 mt-4 flex flex-col gap-2.5 border-0 border-t border-solid border-line pb-1 pt-4">
          <div className="flex items-center justify-between">
            <button onClick={() => rest.stop()} className="flex flex-col items-start gap-0.5 border-0 bg-transparent p-0 text-left">
              <span className="text-xs text-muted">{restState.finished ? 'Przerwa skończona · dotknij, aby zamknąć' : 'Przerwa'}</span>
              <span className={`text-[32px] font-extrabold leading-none tabular-nums ${restState.finished ? 'text-accent' : 'text-ink'}`}>
                {clock(restState.left)}
              </span>
            </button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => rest.add(-15)} className="!rounded-full !border-line">
                −15 s
              </Button>
              <Button variant="outline" onClick={() => rest.add(15)} className="!rounded-full !border-line">
                +15 s
              </Button>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-soft">
            <div className="h-1.5 rounded-full bg-accent transition-[width]" style={{ width: `${Math.min(100, restState.progress * 100)}%` }} />
          </div>
        </div>
      )}
      {items.length > 0 && (
        <div
          className="mx-5 flex justify-between gap-3 pt-3 text-sm text-muted"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
        >
          {nextItem ? (
            <button onClick={() => setIdx(i + 1)} className="min-w-0 border-0 bg-transparent p-0 text-left text-sm text-muted">
              Następne: <span className="font-bold text-ink">{nextEx?.name}</span>
            </button>
          ) : (
            <button onClick={() => setSheet('add')} className="border-0 bg-transparent p-0 text-left text-sm font-bold text-accent">
              + Dodaj ćwiczenie
            </button>
          )}
          {nextItem && <span className="shrink-0">{nextCount} {plural(nextCount, 'seria', 'serie', 'serii')}</span>}
        </div>
      )}

      {/* Arkusze */}
      {sheet === 'photo' && exercise && <PhotoSheet exercise={exercise} onClose={() => setSheet(null)} />}
      {sheet === 'list' && (
        <Sheet title="Ćwiczenia w treningu" onClose={() => setSheet(null)}>
          <div className="flex flex-col gap-2 px-5 pb-2">
            {items.map((it, j) => {
              const ss = allSets.filter((s) => s.exerciseId === it.exerciseId)
              const d = ss.filter((s) => s.done).length
              const lbl = supersetLabel(items, j)
              return (
                <div key={it.exerciseId} className="flex flex-col">
                <button
                  onClick={() => {
                    setIdx(j)
                    setEditingSet(null)
                    setSheet(null)
                  }}
                  className={`flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 text-left ${
                    j === i ? 'border-2 border-solid border-accent' : 'border border-solid border-line'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <ExerciseThumb exercise={exercises.find((e) => e.id === it.exerciseId)} size="sm" />
                    <span className="text-[15px] font-bold text-ink">
                      {lbl ? <span className="text-accent">{lbl} </span> : `${j + 1}. `}
                      {name(it.exerciseId)}
                    </span>
                  </span>
                  <span className={`shrink-0 text-xs font-bold ${d === ss.length && d > 0 ? 'text-accent' : 'text-muted'}`}>
                    {d}/{ss.length}
                  </span>
                </button>
                {linkedWithNext(items, j) && <SupersetLink />}
                </div>
              )
            })}
            <Button variant="outline" onClick={() => setSheet('add')} className="mt-1">
              + Dodaj ćwiczenie
            </Button>
          </div>
        </Sheet>
      )}
      {sheet === 'add' && (
        <ExercisePicker
          title="Dodaj ćwiczenie"
          exclude={items.map((x) => x.exerciseId)}
          onClose={() => setSheet(null)}
          onPick={async (e) => {
            await addExercise(id, e.id)
            setIdx(items.length)
            setEditingSet(null)
          }}
        />
      )}
      {sheet === 'menu' && cur && (
        <ExerciseMenu
          exercise={exercise}
          nextName={nextItem ? name(nextItem.exerciseId) : undefined}
          linkedNext={linkedWithNext(items, i)}
          prevName={i > 0 ? name(items[i - 1].exerciseId) : undefined}
          linkedPrev={i > 0 && linkedWithNext(items, i - 1)}
          onLinkNext={() => toggleSuperset(id, cur.exerciseId)}
          onLinkPrev={() => toggleSuperset(id, items[i - 1].exerciseId)}
          onExerciseNote={(n) => exercise && db.exercises.update(exercise.id, { note: n.trim() || undefined })}
          canPermanent={workout.planDayId !== undefined}
          onClose={() => setSheet(null)}
          onComment={() => openComment(cur.exerciseId)}
          onSwap={(permanent) => {
            setSwapPermanent(permanent)
            setSheet('swap')
          }}
          onRemove={async () => {
            await removeExercise(id, cur.exerciseId)
            setIdx(Math.max(0, i - 1))
            setSheet(null)
          }}
          onProgress={() => navigate({ name: 'cwiczenie', id: cur.exerciseId })}
        />
      )}
      {sheet === 'comment' && commentFor !== null && (
        <CommentSheet
          exerciseName={name(commentFor)}
          note={items.find((it) => it.exerciseId === commentFor)?.note ?? ''}
          onSave={async (note) => {
            await saveComment(commentFor, note)
            if (commentFor === justDone) setJustDone(null)
            setSheet(null)
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'swap' && cur && (
        <ExercisePicker
          title={swapPermanent ? 'Zamień na stałe w planie' : 'Zamień tylko dziś'}
          exclude={items.map((x) => x.exerciseId)}
          onClose={() => setSheet(null)}
          onPick={(e) => swapExercise(id, cur.exerciseId, e.id, swapPermanent)}
        />
      )}
      {sheet === 'finish' && (
        <FinishSheet
          note={workout.note ?? ''}
          undone={undoneCount}
          onNote={(note) => db.workouts.update(id, { note: note || undefined })}
          onFinish={finish}
          onDiscard={() => setSheet('discard')}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'discard' && (
        <Confirm
          title="Odrzucić trening?"
          text="Wszystkie serie z tego treningu zostaną usunięte. Tego nie da się cofnąć."
          confirmLabel="Odrzuć trening"
          danger
          onConfirm={async () => {
            rest.stop()
            await deleteWorkout(id)
            navigate({ name: 'start' }, true)
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  )
}

type SetPatch = Partial<Pick<WorkoutSet, 'weightKg' | 'reps' | 'durationSec' | 'distanceM'>>

/**
 * Rozwinięta seria z przyciskami − / + oraz „Zalicz serię”. Pola zależą od sposobu zapisu ćwiczenia:
 * ciężar × powtórzenia, sam czas (deska), dystans i czas (bieżnia) albo ciężar i dystans (spacer farmera).
 */
function ActiveSet({
  set,
  number,
  prevLabel,
  repsHint,
  editing,
  exercise,
  onComplete,
  onUndo,
  onDelete,
  onCancel,
  onChange,
}: {
  set: WorkoutSet
  number: number
  prevLabel?: string
  repsHint?: string
  editing: boolean
  exercise?: Exercise
  onComplete: () => void
  onUndo: () => void
  onDelete: () => void
  onCancel?: () => void
  onChange: (patch: SetPatch) => void
}) {
  // Hantle zwykle rosną co 1–2 kg, sztanga i maszyny co 2,5 kg.
  const step = exercise?.equipment === 'hantle' ? 1 : 2.5
  const measure = measureOf(exercise)
  const weight = (
    <Stepper
      label={exercise?.equipment === 'masa ciała' ? 'Obciążenie' : 'Ciężar'}
      value={set.weightKg}
      step={step}
      decimal
      suffix="kg"
      onChange={(v) => onChange({ weightKg: v })}
    />
  )
  const fields =
    measure === 'czas' ? (
      <Stepper label="Czas" value={set.durationSec ?? 0} step={5} suffix="s" onChange={(v) => onChange({ durationSec: Math.round(v) })} />
    ) : measure === 'cardio' ? (
      <div className="grid grid-cols-2 gap-2">
        <Stepper label="Dystans" value={set.distanceM ?? 0} step={100} suffix="m" onChange={(v) => onChange({ distanceM: Math.round(v) })} />
        <Stepper
          label="Czas"
          value={Math.round(((set.durationSec ?? 0) / 60) * 10) / 10}
          step={1}
          decimal
          suffix="min"
          onChange={(v) => onChange({ durationSec: Math.round(v * 60) })}
        />
      </div>
    ) : measure === 'ciężar-dystans' ? (
      <div className="grid grid-cols-2 gap-2">
        {weight}
        <Stepper label="Dystans" value={set.distanceM ?? 0} step={10} suffix="m" onChange={(v) => onChange({ distanceM: Math.round(v) })} />
      </div>
    ) : (
      <div className="grid gap-2" style={{ gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)' }}>
        {weight}
        <Stepper label="Powtórzenia" value={set.reps} step={1} suffix="×" onChange={(v) => onChange({ reps: Math.round(v) })} />
      </div>
    )
  const title = set.type === 'rozgrzewka' ? 'Rozgrzewka' : set.type === 'drop' ? `Drop set` : `Seria ${number}`
  return (
    <div className="flex flex-col gap-2.5 rounded-[18px] border-2 border-solid border-accent p-3.5">
      <div className="flex items-center justify-between gap-2 text-[13px]">
        <button
          onClick={() => db.sets.update(set.id, { type: cycleType(set.type) })}
          className="h-8 rounded-full border border-solid border-line bg-transparent px-3 text-[13px] font-extrabold text-ink"
          aria-label={`Typ serii: ${TYPE_LABEL[set.type]}. Zmień typ`}
        >
          {title} ▾
        </button>
        <span className="text-muted">
          {prevLabel ? `ostatnio ${prevLabel}` : repsHint ? `cel ${repsHint} powt.` : 'pierwszy raz'}
        </span>
      </div>
      {fields}
      {editing ? (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="soft" onClick={onUndo}>
            Cofnij zaliczenie
          </Button>
          <Button onClick={onComplete}>Zapisz</Button>
        </div>
      ) : (
        <Button size="lg" onClick={onComplete}>
          Zalicz serię
        </Button>
      )}
      <div className="flex justify-between">
        <Button variant="danger" size="sm" onClick={onDelete}>
          Usuń serię
        </Button>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Zwiń
          </Button>
        )}
      </div>
    </div>
  )
}

/** Łącznik między ćwiczeniami superserii na liście. */
export function SupersetLink() {
  return (
    <div className="flex items-center gap-2 py-1 pl-6 text-[11px] font-extrabold tracking-wide text-accent">
      <span className="h-4 w-0.5 rounded-full bg-accent" />
      SUPERSERIA
    </div>
  )
}

function ExerciseMenu({
  exercise,
  nextName,
  linkedNext,
  prevName,
  linkedPrev,
  onLinkNext,
  onLinkPrev,
  onExerciseNote,
  canPermanent,
  onClose,
  onComment,
  onSwap,
  onRemove,
  onProgress,
}: {
  exercise?: Exercise
  nextName?: string
  linkedNext: boolean
  prevName?: string
  linkedPrev: boolean
  onLinkNext: () => void
  onLinkPrev: () => void
  onExerciseNote: (n: string) => void
  canPermanent: boolean
  onClose: () => void
  onComment: () => void
  onSwap: (permanent: boolean) => void
  onRemove: () => void
  onProgress: () => void
}) {
  const [fixed, setFixed] = useState(exercise?.note ?? '')
  return (
    <Sheet title={exercise?.name ?? 'Ćwiczenie'} onClose={onClose}>
      <div className="flex flex-col gap-2 px-5 pb-2">
        <TextField
          label="Stała notatka (w każdym treningu)"
          value={fixed}
          placeholder="np. siedzisko 4, uchwyt szeroki"
          onChange={(v) => {
            setFixed(v)
            onExerciseNote(v)
          }}
        />
        <Button variant="soft" onClick={onComment}>
          💬 Komentarz na następny raz
        </Button>
        {nextName && (
          <Button variant={linkedNext ? 'outline' : 'soft'} onClick={onLinkNext} className="mt-2">
            {linkedNext ? `Rozłącz superserię z: ${nextName}` : `Superseria z następnym: ${nextName}`}
          </Button>
        )}
        {linkedPrev && prevName && (
          <Button variant="outline" onClick={onLinkPrev}>
            Rozłącz superserię z: {prevName}
          </Button>
        )}
        <Button variant="soft" onClick={() => onSwap(false)} className={nextName || linkedPrev ? '' : 'mt-2'}>
          Zamień ćwiczenie — tylko dziś
        </Button>
        {canPermanent && (
          <Button variant="soft" onClick={() => onSwap(true)}>
            Zamień ćwiczenie — na stałe w planie
          </Button>
        )}
        <Button variant="soft" onClick={onProgress}>
          Zobacz postęp i rekordy
        </Button>
        <Button variant="danger" onClick={onRemove}>
          Usuń z tego treningu
        </Button>
      </div>
    </Sheet>
  )
}

function FinishSheet({
  note,
  undone,
  onNote,
  onFinish,
  onDiscard,
  onClose,
}: {
  note: string
  undone: number
  onNote: (n: string) => void
  onFinish: () => void
  onDiscard: () => void
  onClose: () => void
}) {
  const [n, setN] = useState(note)
  return (
    <Sheet title="Zakończyć trening?" onClose={onClose}>
      <div className="flex flex-col gap-3 px-5 pb-2">
        {undone > 0 && (
          <p className="m-0 text-[15px] text-muted">
            Niezaliczone serie ({undone}) nie zostaną zapisane w historii.
          </p>
        )}
        <TextField
          label="Notatka do treningu (opcjonalnie)"
          value={n}
          placeholder="np. mało snu, dobra forma"
          onChange={(v) => {
            setN(v)
            onNote(v)
          }}
        />
        <Button size="lg" onClick={onFinish}>
          Zakończ i zapisz
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Wróć do treningu
        </Button>
        <Button variant="danger" onClick={onDiscard}>
          Odrzuć trening
        </Button>
      </div>
    </Sheet>
  )
}

/** Komentarz do ćwiczenia w tym treningu — wyświetli się przy następnym treningu z tym ćwiczeniem. */
function CommentSheet({
  exerciseName,
  note,
  onSave,
  onClose,
}: {
  exerciseName: string
  note: string
  onSave: (n: string) => void
  onClose: () => void
}) {
  const [n, setN] = useState(note)
  return (
    <Sheet title={exerciseName} onClose={onClose}>
      <div className="flex flex-col gap-3 px-5 pb-2">
        <label className="flex flex-col gap-1.5 text-[13px] font-bold text-muted">
          Komentarz — zobaczysz go przy następnym treningu
          <textarea
            value={n}
            autoFocus
            rows={3}
            placeholder="np. następnym razem 62,5 kg · bolał bark · węższy chwyt"
            onChange={(e) => setN(e.target.value)}
            className="resize-none rounded-2xl border border-solid border-line bg-card px-4 py-3 text-base font-semibold text-ink outline-none focus:border-accent"
          />
        </label>
        <Button size="lg" onClick={() => onSave(n)}>
          Zapisz komentarz
        </Button>
        {note && (
          <Button variant="danger" onClick={() => onSave('')}>
            Usuń komentarz
          </Button>
        )}
      </div>
    </Sheet>
  )
}
