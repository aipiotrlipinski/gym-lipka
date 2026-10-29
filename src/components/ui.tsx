import { useEffect, useState, type ReactNode } from 'react'
import { back, type Route } from '../router'
import { BackIcon, CloseIcon } from './icons'

/** Wspólne klocki wyglądu, żeby każdy ekran wyglądał spójnie. */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-line bg-card ${className}`}>{children}</div>
}

export function ScreenTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-6">
      <h1 className="m-0 text-[28px] font-extrabold tracking-tight">{children}</h1>
      {action}
    </div>
  )
}

/** Pasek z przyciskiem Wstecz dla ekranów podrzędnych. */
export function TopBar({ fallback, children, right }: { fallback: Route; children?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-5 pb-2 pt-5">
      <RoundButton label="Wstecz" onClick={() => back(fallback)}>
        <BackIcon />
      </RoundButton>
      <div className="min-w-0 flex-1 truncate text-sm text-muted">{children}</div>
      {right}
    </div>
  )
}

export function RoundButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-card text-ink"
    >
      {children}
    </button>
  )
}

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 pb-2 pt-5">
      <span className="text-[13px] font-bold tracking-wide text-muted">{children}</span>
      {action}
    </div>
  )
}

type Variant = 'primary' | 'outline' | 'soft' | 'ghost' | 'danger'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent border-transparent font-extrabold',
  outline: 'bg-transparent text-ink border-ink font-bold',
  soft: 'bg-soft text-ink border-transparent font-bold',
  ghost: 'bg-transparent text-muted border-transparent font-bold',
  danger: 'bg-transparent text-[#C0392B] border-transparent font-bold',
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled,
  className = '',
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
}) {
  const h = size === 'lg' ? 'h-14 text-[17px] rounded-2xl' : size === 'sm' ? 'h-9 px-3 text-[13px] rounded-full' : 'h-11 px-4 text-[15px] rounded-2xl'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`border ${h} ${VARIANTS[variant]} disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}

export function Badge({ children, tone = 'pr' }: { children: ReactNode; tone?: 'pr' | 'accent' | 'soft' }) {
  const c = tone === 'pr' ? 'bg-pr-bg text-pr-ink' : tone === 'accent' ? 'bg-accent text-on-accent' : 'bg-soft text-muted'
  return <span className={`inline-block shrink-0 rounded-[10px] px-2 py-1 text-[11px] font-extrabold ${c}`}>{children}</span>
}

/** Arkusz od dołu ekranu (wybór ćwiczenia, potwierdzenia, formularze). */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Zamknij" onClick={onClose} className="absolute inset-0 border-0 bg-black/40" />
      <div
        className="relative flex max-h-[88vh] w-full max-w-[480px] flex-col rounded-t-3xl bg-bg"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 className="m-0 text-lg font-extrabold">{title}</h2>
          <RoundButton label="Zamknij" onClick={onClose}>
            <CloseIcon />
          </RoundButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

/** Pole liczby z przyciskami − / +. Dotknięcie liczby pozwala ją wpisać. */
export function Stepper({
  value,
  onChange,
  step,
  min = 0,
  suffix,
  label,
  decimal = false,
  compact = false,
  accent = false,
}: {
  value: number
  onChange: (v: number) => void
  step: number
  min?: number
  suffix?: string
  label: string
  decimal?: boolean
  /** Mniejsza wersja do list (np. obciążenie na ekranie Plany). */
  compact?: boolean
  /** Wyróżnienie kolorem motywu (obciążenie w planach). */
  accent?: boolean
}) {
  const btn = accent ? 'bg-accent text-on-accent' : 'bg-soft text-ink'
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(n).replace('.', ','))
  // W trakcie wpisywania trzymamy tekst lokalnie, żeby dało się wpisać np. „77,” przed „5”.
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <div
      className={`flex items-center justify-between gap-1 rounded-[14px] ${accent ? 'border border-solid border-accent/40 bg-accent/10' : 'bg-row'} ${
        compact ? 'h-11 px-1' : 'h-[52px] px-1.5'
      }`}
    >
      <button
        aria-label={`${label}: mniej`}
        onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}
        className={`shrink-0 rounded-xl border-0 font-bold ${btn} ${compact ? 'h-9 w-9 text-lg' : 'h-10 w-9 text-xl'}`}
      >
        −
      </button>
      <label className="flex min-w-0 flex-1 items-baseline justify-center gap-0.5">
        <span className="sr-only">{label}</span>
        <input
          style={{ width: `${Math.max(2, (draft ?? fmt(value)).length) + 0.6}ch` }}
          inputMode={decimal ? 'decimal' : 'numeric'}
          value={draft ?? fmt(value)}
          onFocus={(e) => {
            setDraft(fmt(value))
            e.currentTarget.select()
          }}
          onBlur={() => setDraft(null)}
          onChange={(e) => {
            const text = e.target.value.replace(/[^\d.,]/g, '')
            setDraft(text)
            const n = parseFloat(text.replace(',', '.'))
            if (Number.isFinite(n)) onChange(Math.max(min, n))
          }}
          className={`min-w-0 max-w-full border-0 bg-transparent p-0 text-center font-extrabold outline-none ${accent ? 'text-accent' : 'text-ink'} ${compact ? 'text-base' : 'text-[19px]'}`}
        />
        {suffix && <span className={`shrink-0 text-xs font-bold ${accent ? 'text-accent' : 'text-muted'}`}>{suffix}</span>}
      </label>
      <button
        aria-label={`${label}: więcej`}
        onClick={() => onChange(+(value + step).toFixed(2))}
        className={`shrink-0 rounded-xl border-0 font-bold ${btn} ${compact ? 'h-9 w-9 text-lg' : 'h-10 w-9 text-xl'}`}
      >
        +
      </button>
    </div>
  )
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-bold text-muted">
      {label}
      <input
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-2xl border border-line bg-card px-4 text-base font-semibold text-ink outline-none focus:border-accent"
      />
    </label>
  )
}

/** Pole tekstowe zapisujące się na bieżąco do bazy (lokalny stan, żeby kursor nie skakał). */
export function SavedTextField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value)
  return (
    <TextField
      label={label}
      value={v}
      onChange={(nv) => {
        setV(nv)
        onSave(nv)
      }}
    />
  )
}

/** Pusty stan listy. */
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Card className="mx-5 mt-3 flex flex-col gap-2 p-5">
      <span className="text-[17px] font-extrabold">{title}</span>
      {children && <div className="text-sm leading-relaxed text-muted">{children}</div>}
    </Card>
  )
}

/** Proste okno potwierdzenia na arkuszu. */
export function Confirm({
  title,
  text,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  title: string
  text: ReactNode
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="flex flex-col gap-3 px-5 pb-2">
        <p className="m-0 text-[15px] leading-relaxed text-muted">{text}</p>
        <Button
          size="lg"
          onClick={() => {
            onConfirm()
            onClose()
          }}
          className={danger ? '!bg-[#C0392B] !text-white' : ''}
        >
          {confirmLabel}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Anuluj
        </Button>
      </div>
    </Sheet>
  )
}
