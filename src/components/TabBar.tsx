import type { ReactNode } from 'react'
import { BodyIcon, CalendarIcon, DumbbellIcon, HomeIcon, ListIcon } from './icons'

export type Tab = 'start' | 'plany' | 'historia' | 'cwiczenia' | 'miesnie'

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'start', label: 'Start', icon: <HomeIcon /> },
  { id: 'plany', label: 'Plany', icon: <ListIcon /> },
  { id: 'historia', label: 'Historia', icon: <CalendarIcon /> },
  { id: 'cwiczenia', label: 'Ćwiczenia', icon: <DumbbellIcon /> },
  { id: 'miesnie', label: 'Mięśnie', icon: <BodyIcon /> },
]

/** Dolny pasek. W kolorystyce Volt pływa jako pigułka (index.css → .tabbar). */
export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      className="tabbar grid grid-cols-5 border-t border-line bg-card px-1 pt-1"
      style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
    >
      {TABS.map((t) => {
        const active = t.id === tab
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            aria-current={active ? 'page' : undefined}
            className={`flex h-12 flex-col items-center justify-center gap-0.5 border-0 bg-transparent text-[11px] ${
              active ? 'font-extrabold text-accent' : 'font-semibold text-muted'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        )
      })}
    </nav>
  )
}
