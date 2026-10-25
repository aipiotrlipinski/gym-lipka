import { useState } from 'react'
import { TIPS } from '../data/tips'
import type { Exercise } from '../db'

export function tipsFor(e?: Exercise) {
  return e && !e.custom ? (TIPS[e.name] ?? []) : []
}

function TipList({ tips }: { tips: string[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {tips.map((t) => (
        <li key={t} className="flex gap-2.5 text-sm leading-snug text-ink">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
          {t}
        </li>
      ))}
    </ul>
  )
}

/** Wskazówki techniczne jako karta (ekran ćwiczenia). */
export function TipsCard({ exercise }: { exercise?: Exercise }) {
  const tips = tipsFor(exercise)
  if (tips.length === 0) return null
  return (
    <div className="mx-5 mb-1 flex flex-col gap-2.5 rounded-[20px] bg-soft px-4 py-3.5">
      <span className="text-[13px] font-bold tracking-wide text-muted">NA CO ZWRACAĆ UWAGĘ</span>
      <TipList tips={tips} />
    </div>
  )
}

/** Zwijane wskazówki na ekranie treningu — nie zabierają miejsca, gdy niepotrzebne. */
export function TipsToggle({ exercise }: { exercise?: Exercise }) {
  const [open, setOpen] = useState(false)
  const tips = tipsFor(exercise)
  if (tips.length === 0) return null
  return (
    <div className="mx-5 mb-3">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="h-9 rounded-full border border-solid border-line bg-card px-3.5 text-[13px] font-bold text-ink"
      >
        {open ? 'Ukryj wskazówki ▴' : 'Jak wykonać? ▾'}
      </button>
      {open && (
        <div className="mt-2.5 rounded-[18px] bg-soft px-4 py-3">
          <TipList tips={tips} />
        </div>
      )}
    </div>
  )
}
