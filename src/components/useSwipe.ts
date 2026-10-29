import { useRef, useState, type CSSProperties, type TouchEvent } from 'react'

/**
 * Przesuwanie palcem w poziomie między ekranami (np. ćwiczeniami w treningu).
 * Treść jedzie za palcem; po puszczeniu dalej niż próg zmienia się strona z krótką animacją.
 * Ruch w pionie zostaje zwykłym przewijaniem.
 */
export function useSwipe({ canPrev, canNext, onPrev, onNext }: { canPrev: boolean; canNext: boolean; onPrev: () => void; onNext: () => void }) {
  const [dx, setDxState] = useState(0)
  const [anim, setAnim] = useState(false)
  const dxRef = useRef(0)
  const start = useRef<{ x: number; y: number; lock: null | 'h' | 'v' } | null>(null)
  const busy = useRef(false)

  const setDx = (v: number) => {
    dxRef.current = v
    setDxState(v)
  }

  const reset = () => {
    setAnim(true)
    setDx(0)
  }

  const slide = (dir: -1 | 1, change: () => void) => {
    busy.current = true
    const w = window.innerWidth
    setAnim(true)
    setDx(dir * w)
    window.setTimeout(() => {
      change()
      setAnim(false)
      setDx(-dir * w * 0.6)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setAnim(true)
          setDx(0)
          busy.current = false
        }),
      )
    }, 150)
  }

  const handlers = {
    onTouchStart: (e: TouchEvent) => {
      if (busy.current || e.touches.length > 1) return
      const t = e.touches[0]
      start.current = { x: t.clientX, y: t.clientY, lock: null }
      setAnim(false)
    },
    onTouchMove: (e: TouchEvent) => {
      const s = start.current
      if (!s) return
      const t = e.touches[0]
      const mx = t.clientX - s.x
      const my = t.clientY - s.y
      if (!s.lock) {
        if (Math.abs(mx) < 12 && Math.abs(my) < 12) return
        s.lock = Math.abs(mx) > Math.abs(my) * 1.5 ? 'h' : 'v'
      }
      if (s.lock !== 'h') return
      const blocked = (mx > 0 && !canPrev) || (mx < 0 && !canNext)
      setDx(blocked ? mx * 0.2 : mx)
    },
    onTouchEnd: () => {
      const s = start.current
      start.current = null
      if (!s || s.lock !== 'h') return
      const d = dxRef.current
      const threshold = Math.min(90, window.innerWidth * 0.22)
      if (d <= -threshold && canNext) slide(-1, onNext)
      else if (d >= threshold && canPrev) slide(1, onPrev)
      else reset()
    },
    onTouchCancel: () => {
      start.current = null
      reset()
    },
  }

  const style: CSSProperties = {
    transform: dx ? `translate3d(${dx}px,0,0)` : undefined,
    transition: anim ? 'transform 150ms ease-out' : 'none',
    touchAction: 'pan-y',
  }

  return { handlers, style }
}
