import { useState } from 'react'

export interface Point {
  x: number // znacznik czasu
  y: number
}

/** Ładne kroki osi: 2,5 / 5 / 10 / 20 … */
function niceStep(range: number, target = 4) {
  const raw = range / target
  const pow = 10 ** Math.floor(Math.log10(raw))
  const n = raw / pow
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow
}

const fmtDate = (t: number) => new Date(t).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })

/**
 * Prosty wykres liniowy w SVG: wartości w czasie, ostatni punkt wyróżniony.
 * Dotknięcie punktu pokazuje jego wartość i datę.
 */
export function LineChart({ points, unit, label }: { points: Point[]; unit: string; label: string }) {
  const [sel, setSel] = useState<number | null>(null)
  const W = 340
  const H = 180
  const L = 8
  const R = 40
  const T = 14
  const B = 26

  if (points.length === 0) return <p className="m-0 py-8 text-center text-sm text-muted">Brak danych do wykresu.</p>

  const ys = points.map((p) => p.y)
  let lo = Math.min(...ys)
  let hi = Math.max(...ys)
  if (hi - lo < 1) {
    lo -= 2.5
    hi += 2.5
  }
  const step = niceStep(hi - lo)
  lo = Math.floor(lo / step) * step
  hi = Math.ceil(hi / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(+v.toFixed(2))

  const x0 = points[0].x
  const x1 = points[points.length - 1].x
  const X = (t: number) => (x1 === x0 ? L + (W - L - R) / 2 : L + ((t - x0) / (x1 - x0)) * (W - L - R))
  const Y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B)
  const line = points.map((p) => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ')
  const area = `M${X(x0)} ${H - B} L${line.replaceAll(' ', ' L')} L${X(x1)} ${H - B} Z`
  const s = sel !== null ? points[sel] : null
  const fmtV = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ','))

  return (
    <div className="flex flex-col gap-1">
      <div className="h-5 text-[13px] text-muted">
        {s ? (
          <>
            <span className="font-extrabold text-ink">
              {fmtV(s.y)} {unit}
            </span>{' '}
            · {fmtDate(s.x)}
          </>
        ) : (
          'Dotknij punktu, aby zobaczyć szczegóły'
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--line)" strokeWidth="1" />
            <text x={W} y={Y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
              {fmtV(v)}
            </text>
          </g>
        ))}
        <path d={area} fill="var(--accent)" fillOpacity="0.12" />
        {points.length > 1 && (
          <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {points.map((p, i) => {
          const lastPt = i === points.length - 1
          return (
            <g key={i} onClick={() => setSel(sel === i ? null : i)} style={{ cursor: 'pointer' }}>
              <circle cx={X(p.x)} cy={Y(p.y)} r="14" fill="transparent" />
              <circle
                cx={X(p.x)}
                cy={Y(p.y)}
                r={lastPt || sel === i ? 6 : 4}
                fill={lastPt || sel === i ? 'var(--accent)' : 'var(--card)'}
                stroke="var(--accent)"
                strokeWidth="2"
              />
            </g>
          )
        })}
        <text x={L} y={H - 6} fontSize="11" fill="var(--muted)">
          {fmtDate(x0)}
        </text>
        {x1 !== x0 && (
          <text x={W - R} y={H - 6} textAnchor="end" fontSize="11" fill="var(--muted)">
            {fmtDate(x1)}
          </text>
        )}
      </svg>
    </div>
  )
}
