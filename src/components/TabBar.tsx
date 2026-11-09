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

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      className="grid grid-cols-5 border-t border-line bg-card px-2 pt-2"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      {TABS.map((t) => {
        const active = t.id === tab
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            aria-current={active ? 'page' : undefined}
            className={`flex h-14 flex-col items-center justify-center gap-1 border-0 bg-transparent text-xs ${
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
