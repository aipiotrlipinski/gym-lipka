import type { ReactNode } from 'react'

/** Wspólne klocki wyglądu, żeby każdy ekran wyglądał spójnie. */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-line bg-card ${className}`}>{children}</div>
}

export function ScreenTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 pb-2 pt-6">
      <h1 className="m-0 text-[28px] font-extrabold tracking-tight">{children}</h1>
      {action}
    </div>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="px-5 pb-2 pt-5 text-[13px] font-bold tracking-wide text-muted">{children}</div>
}

/** Pusty stan ekranu, którego funkcje przyjdą w kolejnych etapach. */
export function ComingSoon({ title, stage, children }: { title: string; stage: string; children: ReactNode }) {
  return (
    <Card className="mx-5 mt-3 flex flex-col gap-2 p-5">
      <span className="text-[13px] font-bold tracking-wide text-accent">{stage.toUpperCase()}</span>
      <span className="text-lg font-extrabold">{title}</span>
      <p className="m-0 text-sm leading-relaxed text-muted">{children}</p>
    </Card>
  )
}
