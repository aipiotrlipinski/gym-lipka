import { useEffect, useState } from 'react'
import type { Exercise } from '../db'
import { EXERCISE_IMAGES } from '../data/exerciseImages'
import { exerciseImage, frameUrl, thumbUrl } from '../lib/exerciseImage'
import { Sheet } from './ui'

const SIZES = {
  sm: 'h-[33px] w-11 rounded-lg',
  md: 'h-[42px] w-14 rounded-xl',
  lg: 'h-[60px] w-20 rounded-[14px]',
}

/** Mała miniatura ćwiczenia do list. Bez zdjęcia — pierwsze litery nazwy. */
export function ExerciseThumb({ exercise, size = 'md' }: { exercise?: Exercise; size?: keyof typeof SIZES }) {
  const slug = exerciseImage(exercise)
  const [broken, setBroken] = useState(false)
  const box = `${SIZES[size]} shrink-0 overflow-hidden border border-solid border-line`
  if (!slug || broken) {
    const initials = (exercise?.name ?? '?')
      .split(/\s+/)
      .filter((w) => /^\p{L}/u.test(w))
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('')
    return (
      <span aria-hidden className={`${box} flex items-center justify-center bg-soft text-[13px] font-extrabold text-muted`}>
        {initials}
      </span>
    )
  }
  return (
    <img
      src={thumbUrl(slug)}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className={`${box} bg-soft object-cover`}
    />
  )
}

/**
 * Duże zdjęcie z ruchem: pozycja startowa i końcowa zmieniają się na przemian jak animacja.
 * Dotknięcie zatrzymuje / wznawia. Przy ograniczonych animacjach w systemie startuje zatrzymane.
 */
export function ExercisePhoto({ exercise, className = '' }: { exercise?: Exercise; className?: string }) {
  const slug = exerciseImage(exercise)
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [playing, setPlaying] = useState(!reduced)
  const [frame, setFrame] = useState<0 | 1>(0)

  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 1100)
    return () => clearInterval(t)
  }, [playing])

  if (!slug) return null
  return (
    <button
      onClick={() => setPlaying((p) => !p)}
      aria-label={playing ? 'Zatrzymaj animację ruchu' : 'Pokaż animację ruchu'}
      className={`relative block aspect-[3/2] w-full overflow-hidden rounded-[20px] border border-solid border-line bg-soft p-0 ${className}`}
    >
      {([0, 1] as const).map((k) => (
        <img
          key={k}
          src={frameUrl(slug, k)}
          alt={k === 0 ? `${exercise?.name}: pozycja startowa` : `${exercise?.name}: pozycja końcowa`}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
          style={{ opacity: frame === k ? 1 : 0 }}
        />
      ))}
      <span className="absolute bottom-2.5 left-2.5 flex gap-1">
        {(['Start', 'Koniec'] as const).map((l, k) => (
          <span
            key={l}
            onClick={(e) => {
              e.stopPropagation()
              setPlaying(false)
              setFrame(k as 0 | 1)
            }}
            className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
              frame === k ? 'bg-accent text-on-accent' : 'bg-black/45 text-white'
            }`}
          >
            {l}
          </span>
        ))}
      </span>
      {!playing && (
        <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-extrabold text-white">
          ▶ Ruch
        </span>
      )}
    </button>
  )
}

/** Arkusz z dużym zdjęciem — podgląd w trakcie treningu. */
export function PhotoSheet({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  return (
    <Sheet title={exercise.name} onClose={onClose}>
      <div className="px-5 pb-3">
        <ExercisePhoto exercise={exercise} />
        <p className="mb-0 mt-2 text-xs text-muted">Dotknij zdjęcia, żeby zatrzymać ruch. „Start” i „Koniec” pokazują pozycje.</p>
      </div>
    </Sheet>
  )
}

/** Wybór zdjęcia dla własnego ćwiczenia — z biblioteki wbudowanych zdjęć. */
export function ImagePickerSheet({
  current,
  onPick,
  onClose,
}: {
  current?: string
  onPick: (slug: string | undefined) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/ł/g, 'l')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
  const all = Object.entries(EXERCISE_IMAGES).sort((a, b) => a[0].localeCompare(b[0], 'pl'))
  const list = all.filter(([n]) => norm(q.trim()).split(/\s+/).every((w) => norm(n).includes(w)))
  return (
    <Sheet title="Wybierz zdjęcie" onClose={onClose}>
      <div className="px-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Szukaj podobnego ćwiczenia"
          aria-label="Szukaj zdjęcia"
          className="h-12 w-full rounded-2xl border border-solid border-line bg-card px-4 text-base text-ink outline-none"
        />
        {current && (
          <button onClick={() => onPick(undefined)} className="mt-3 border-0 bg-transparent p-0 text-sm font-bold text-accent">
            Usuń zdjęcie
          </button>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2 pb-2">
          {list.map(([name, slug]) => (
            <button
              key={name}
              onClick={() => onPick(slug)}
              className={`flex flex-col gap-1 rounded-2xl border-solid bg-card p-1.5 text-left ${
                current === slug ? 'border-2 border-accent' : 'border border-line'
              }`}
            >
              <img src={thumbUrl(slug)} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-xl object-cover" />
              <span className="line-clamp-2 px-1 text-xs font-bold leading-tight text-ink">{name}</span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}
