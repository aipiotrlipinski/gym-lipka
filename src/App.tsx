import { useEffect, useRef } from 'react'
import { nextPlanDay, startWorkout } from './lib/workout'
import { TabBar, type Tab } from './components/TabBar'
import { back, navigate, useRoute, type Route } from './router'
import { usePalette, useTheme } from './theme'
import { useName } from './lib/prefs'
import { Witaj } from './screens/Witaj'
import { Start } from './screens/Start'
import { Plany, PlanEdit, DayEdit } from './screens/Plany'
import { Historia } from './screens/Historia'
import { Cwiczenia } from './screens/Cwiczenia'
import { ExerciseDetail } from './screens/ExerciseDetail'
import { Workout } from './screens/Workout'
import { Session } from './screens/Session'
import { Settings } from './screens/Settings'

/** Skrót „Zacznij trening” z ikony: od razu otwiera trening (trwający albo następny z planu). */
let quickStarting: Promise<number> | null = null
function QuickStart() {
  useEffect(() => {
    let alive = true
    // Jedno uruchomienie naraz — żeby podwójne wywołanie nie założyło dwóch treningów.
    quickStarting ??= nextPlanDay()
      .then((d) => startWorkout(d?.id))
      .finally(() => (quickStarting = null))
    ;(async () => {
      const id = await quickStarting!
      if (alive) navigate({ name: 'trening', id }, true)
    })()
    return () => {
      alive = false
    }
  }, [])
  return <p className="px-5 pt-10 text-center text-sm text-muted">Otwieram trening…</p>
}

/** Która zakładka jest podświetlona dla danego ekranu; null = ekran bez dolnego paska. */
function tabOf(r: Route): Tab | null {
  switch (r.name) {
    case 'start':
      return 'start'
    case 'plany':
    case 'plan':
    case 'dzien':
      return 'plany'
    case 'historia':
    case 'sesja':
      return 'historia'
    case 'cwiczenia':
    case 'cwiczenie':
      return 'cwiczenia'
    default:
      return null
  }
}

function Screen({ route }: { route: Route }) {
  const { mode, setMode } = useTheme()
  switch (route.name) {
    case 'start':
      return <Start />
    case 'plany':
      return <Plany />
    case 'plan':
      return <PlanEdit id={route.id} />
    case 'dzien':
      return <DayEdit id={route.id} />
    case 'historia':
      return <Historia />
    case 'cwiczenia':
      return <Cwiczenia />
    case 'cwiczenie':
      return <ExerciseDetail id={route.id} />
    case 'trening':
      return <Workout id={route.id} />
    case 'podsumowanie':
      return <Session id={route.id} fresh />
    case 'sesja':
      return <Session id={route.id} />
    case 'ustawienia':
      return <Settings mode={mode} setMode={setMode} onClose={() => back({ name: 'start' })} />
    case 'szybki-start':
      return <QuickStart />
  }
}

export default function App() {
  useTheme()
  usePalette()
  const name = useName()
  const route = useRoute()
  const tab = tabOf(route)
  const main = useRef<HTMLElement>(null)

  // Nowy ekran zaczyna się od góry.
  useEffect(() => {
    main.current?.scrollTo(0, 0)
  }, [route])

  // Pierwsze uruchomienie: najpierw imię (skrót „Zacznij trening” nie czeka).
  if (name === null && route.name !== 'szybki-start') {
    return (
      <div className="mx-auto h-full max-w-[480px] overflow-y-auto" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <Witaj />
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col">
      <main ref={main} className="flex-1 overflow-y-auto" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <Screen key={'id' in route ? `${route.name}-${route.id}` : route.name} route={route} />
      </main>
      {tab && <TabBar tab={tab} onChange={(t) => navigate({ name: t }, true)} />}
    </div>
  )
}
