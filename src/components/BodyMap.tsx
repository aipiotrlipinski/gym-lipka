import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { MuscleId } from '../data/muscles'
import { HEAD, NECK, VIEWS, VIEW_H, VIEW_W, type Side } from './bodyShapes'

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export const FULL: Box = { x: -6, y: 2, w: VIEW_W + 12, h: VIEW_H + 4 }

/** Kolor mięśnia dla poziomu 0–4 (0 = nietrenowany). Oparte na kolorze akcentu, więc działa w każdej kolorystyce. */
export const LEVEL_FILL = [
  'color-mix(in srgb, var(--ink) 14%, var(--card))',
  'color-mix(in srgb, var(--accent) 28%, var(--card))',
  'color-mix(in srgb, var(--accent) 50%, var(--card))',
  'color-mix(in srgb, var(--accent) 75%, var(--card))',
  'var(--accent)',
]
const BODY_FILL = 'color-mix(in srgb, var(--ink) 8%, var(--card))'
const MIRROR = 'matrix(-1 0 0 1 200 0)'

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Obszar do przybliżenia: mięsień z marginesem, żeby było widać, gdzie leży.
 * Mięśnie daleko od środka (ręce, barki) — tylko jedna strona ciała, inaczej przybliżenie byłoby za małe.
 */
function zoomBox(svg: SVGSVGElement, id: MuscleId): Box | null {
  const g = svg.querySelector<SVGGElement>(`g[data-m="${id}"]`)
  if (!g) return null
  let b: { x: number; y: number; width: number; height: number } = g.getBBox()
  if (b.width >= 95) {
    const own = [...g.children].filter((c): c is SVGPathElement => c instanceof SVGPathElement).map((c) => c.getBBox())
    const x = Math.min(...own.map((o) => o.x))
    const y = Math.min(...own.map((o) => o.y))
    b = { x, y, width: Math.max(...own.map((o) => o.x + o.width)) - x, height: Math.max(...own.map((o) => o.y + o.height)) - y }
  }
  const size = Math.max(b.width, b.height * 0.9, 50)
  const pad = size * 0.35
  return { x: b.x - pad, y: b.y - pad, w: b.width + 2 * pad, h: b.height + 2 * pad }
}

/**
 * Sylwetka z kolorowymi mięśniami. Stuknięcie wybiera mięsień — także obok kształtu
 * (najbliższy w promieniu kilkunastu punktów), bo małe mięśnie trudno trafić palcem.
 */
export function BodyMap({
  side,
  levels,
  selected,
  onSelect,
  style,
}: {
  side: Side
  levels: Record<MuscleId, number>
  selected: MuscleId | null
  onSelect: (id: MuscleId) => void
  style?: CSSProperties
}) {
  const svg = useRef<SVGSVGElement>(null)
  const [box, setBox] = useState<Box>(FULL)
  const current = useRef<Box>(FULL)
  const first = useRef(true)
  const view = VIEWS[side]

  // Przybliżenie / oddalenie z płynnym przejściem (przy pierwszym wyświetleniu — od razu).
  useLayoutEffect(() => {
    const target = (selected && svg.current && zoomBox(svg.current, selected)) || FULL
    const from = current.current
    if (first.current || reducedMotion()) {
      first.current = false
      current.current = target
      setBox(target)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / 420)
      const k = ease(t)
      const b = {
        x: from.x + (target.x - from.x) * k,
        y: from.y + (target.y - from.y) * k,
        w: from.w + (target.w - from.w) * k,
        h: from.h + (target.h - from.h) * k,
      }
      current.current = b
      setBox(b)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [selected, side])

  function tap(e: React.PointerEvent<SVGSVGElement>) {
    const hit = (e.target as Element).closest('g[data-m]')?.getAttribute('data-m') as MuscleId | null
    if (hit) return onSelect(hit)
    const el = svg.current
    const ctm = el?.getScreenCTM()
    if (!el || !ctm) return
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    let best: { id: MuscleId; d: number } | null = null
    for (const g of el.querySelectorAll<SVGGElement>('g[data-m]')) {
      for (const path of g.querySelectorAll<SVGPathElement>('path')) {
        const b = path.getBBox()
        // Odległość od prostokąta kształtu (uwzględnia odbicie lustrzane prawej strony).
        const mirrored = path.parentElement?.getAttribute('transform') === MIRROR
        const x0 = mirrored ? VIEW_W - b.x - b.width : b.x
        const dx = Math.max(x0 - p.x, 0, p.x - (x0 + b.width))
        const dy = Math.max(b.y - p.y, 0, p.y - (b.y + b.height))
        const d = Math.hypot(dx, dy)
        if (!best || d < best.d) best = { id: g.dataset.m as MuscleId, d }
      }
    }
    if (best && best.d < 14 * (current.current.w / FULL.w)) onSelect(best.id)
  }

  return (
    <svg
      ref={svg}
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerUp={tap}
      role="img"
      aria-label={side === 'przod' ? 'Sylwetka z przodu' : 'Sylwetka z tyłu'}
      className="block w-full touch-manipulation select-none"
      style={style}
    >
      <g fill={BODY_FILL}>
        <path d={HEAD} />
        <path d={NECK} />
        <path d={view.outline} />
        <path d={view.outline} transform={MIRROR} />
      </g>
      {view.muscles.map((m) => {
        const active = m.id === selected
        const props = {
          fill: LEVEL_FILL[levels[m.id] ?? 0],
          stroke: active ? 'var(--ink)' : 'var(--card)',
          strokeWidth: active ? 2.2 : 1,
          vectorEffect: 'non-scaling-stroke' as const,
          strokeLinejoin: 'round' as const,
        }
        return (
          <g
            key={m.id}
            data-m={m.id}
            className="cursor-pointer"
            style={{ opacity: selected && !active ? 0.55 : 1, transition: 'opacity 250ms' }}
          >
            {m.d.map((d, i) => (
              <path key={i} d={d} {...props} />
            ))}
            <g transform={MIRROR}>
              {m.d.map((d, i) => (
                <path key={i} d={d} {...props} />
              ))}
            </g>
          </g>
        )
      })}
    </svg>
  )
}
