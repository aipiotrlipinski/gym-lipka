import type { MuscleId } from '../data/muscles'

/**
 * Własna, uproszczona sylwetka (przód i tył) w układzie 200 × 410.
 * Rysujemy tylko lewą połowę rysunku (x ≤ 100) — prawa to jej lustrzane odbicie względem x = 100.
 * Każdy mięsień może mieć kilka kształtów; wszystkie są klikalne.
 */

export const VIEW_W = 200
export const VIEW_H = 410

export type Side = 'przod' | 'tyl'

export interface MuscleShape {
  id: MuscleId
  d: string[]
}

export interface BodyView {
  /** Lewa połowa obrysu ciała (bez głowy), zamknięta na linii środka. */
  outline: string
  muscles: MuscleShape[]
}

/** Głowa i szyja — wspólne dla obu widoków (pełne kształty, bez odbicia). */
export const HEAD = 'M100,10 C112,10 120,20 120,34 C120,47 112,57 100,57 C88,57 80,47 80,34 C80,20 88,10 100,10 Z'
export const NECK = 'M91,52 L109,52 L110,70 L90,70 Z'

/** Lewa połowa obrysu: bark, ręka, bok tułowia, noga. */
const OUTLINE =
  'M100,64 L90,64 C86,72 78,75 69,77 C57,79 49,87 47,100 C45,114 45,132 45,150 ' +
  'C44,163 41,176 39,192 C37,206 36,218 36,230 C33,238 32,250 36,258 C40,263 45,258 46,250 ' +
  'C47,240 48,232 49,224 C52,206 56,188 58,170 C60,156 62,140 63,124 L64,112 ' +
  'C67,140 70,170 70,198 C69,212 63,224 61,238 C59,262 62,290 67,306 ' +
  'C64,326 62,350 68,382 L69,394 C66,398 64,402 66,406 L88,406 C89,401 87,394 86,388 ' +
  'C89,360 91,336 88,314 C91,294 95,268 97,246 L100,242 Z'

/** Zaokrąglony prostokąt jako ścieżka (płytki mięśnia brzucha). */
function rr(x: number, y: number, w: number, h: number, r: number) {
  return (
    `M${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h - r} ` +
    `Q${x + w},${y + h} ${x + w - r},${y + h} L${x + r},${y + h} Q${x},${y + h} ${x},${y + h - r} ` +
    `L${x},${y + r} Q${x},${y} ${x + r},${y} Z`
  )
}

/** Przedramię i boczny akton barku wyglądają podobnie z przodu i z tyłu. */
const FOREARM = 'M44,172 C41,186 39,200 39,214 C40,220 44,222 48,220 C51,206 55,190 57,174 C53,169 48,169 44,172 Z'
const SIDE_DELT = 'M48,98 C46,108 46,118 48,126 C50,124 52,118 53,112 C52,106 50,101 48,98 Z'

export const FRONT: BodyView = {
  outline: OUTLINE,
  muscles: [
    { id: 'kaptury', d: ['M90,66 C86,72 79,75 71,77 C78,80 85,80 91,76 Z'] },
    { id: 'barki-przod', d: ['M70,79 C59,80 51,87 49,97 C51,102 53,108 54,113 C58,104 64,95 73,88 C73,84 72,81 70,79 Z'] },
    { id: 'barki-bok', d: [SIDE_DELT] },
    { id: 'klatka', d: ['M99,84 L78,83 C70,88 63,98 61,110 C63,121 72,127 84,127 C92,127 97,125 99,122 Z'] },
    { id: 'biceps', d: ['M58,118 C53,127 50,139 50,151 C51,159 55,164 59,163 C62,152 63,139 62,124 C61,121 60,119 58,118 Z'] },
    { id: 'przedramiona', d: [FOREARM] },
    {
      id: 'brzuch',
      d: [rr(88.5, 131, 10.5, 17, 4), rr(88.5, 151, 10.5, 17, 4), rr(88.5, 171, 10.5, 18, 4), 'M88.5,193 L99,193 L99,226 C95,224 91,216 88.5,205 Z'],
    },
    { id: 'skosne', d: ['M85,132 L78,131 C74,150 72,172 74,192 C79,200 83,207 86,213 C86,186 86,158 85,132 Z'] },
    {
      id: 'czworoglowe',
      d: [
        'M64,240 C60,258 61,282 67,300 C70,304 74,303 75,298 C73,280 72,260 73,244 C70,240 67,239 64,240 Z',
        'M76,240 C74,262 75,282 78,298 C80,302 83,302 84,298 C86,280 87,260 86,244 C83,239 79,238 76,240 Z',
        'M88,270 C92,280 93,293 89,302 C87,305 85,303 85,299 C86,290 87,280 88,270 Z',
      ],
    },
    { id: 'przywodziciele', d: ['M89,243 L97,247 C95,257 92,264 89,268 C88,260 88,251 89,243 Z'] },
    {
      id: 'lydki',
      d: [
        'M67,318 C63,334 64,352 69,370 C72,371 74,369 74,364 C75,348 74,332 71,318 C70,315 68,315 67,318 Z',
        'M87,320 C90,334 90,350 87,366 C85,368 82,366 82,361 C82,346 83,332 85,321 C86,318 87,318 87,320 Z',
      ],
    },
  ],
}

export const BACK: BodyView = {
  outline: OUTLINE,
  muscles: [
    { id: 'kaptury', d: ['M100,62 L90,64 C86,72 78,75 69,78 C80,84 90,102 100,140 Z'] },
    { id: 'barki-tyl', d: ['M68,81 C58,81 50,88 49,98 C52,105 58,108 66,100 C70,94 71,87 68,81 Z'] },
    { id: 'barki-bok', d: [SIDE_DELT] },
    { id: 'triceps', d: ['M51,110 C48,125 48,141 50,157 C53,163 58,163 60,157 C62,142 62,126 60,110 C57,106 54,106 51,110 Z'] },
    { id: 'przedramiona', d: [FOREARM] },
    { id: 'najszersze', d: ['M65,104 C72,114 84,126 95,146 L92,149 C90,164 89,178 88,190 C82,194 77,196 73,194 C71,166 69,134 65,104 Z'] },
    { id: 'prostowniki', d: ['M99,146 L92,149 C90,168 89,188 89,206 C92,208 96,210 99,210 Z'] },
    { id: 'posladki', d: ['M98,214 C86,211 71,215 65,229 C61,245 66,261 80,263 C90,263 96,257 98,249 Z'] },
    {
      id: 'dwuglowe',
      d: [
        'M65,264 C63,280 65,294 70,304 C74,306 77,304 78,300 C78,288 79,276 80,266 C74,267 69,266 65,264 Z',
        'M82,266 C82,278 82,290 81,300 C83,305 87,305 88,301 C91,290 93,278 94,264 C90,266 86,267 82,266 Z',
      ],
    },
    {
      id: 'lydki',
      d: [
        'M70,314 C64,328 64,346 71,360 C76,352 78,334 78,316 C76,312 72,312 70,314 Z',
        'M80,316 C80,334 82,350 81,362 C88,352 90,334 87,316 C85,312 82,312 80,316 Z',
      ],
    },
  ],
}

export const VIEWS: Record<Side, BodyView> = { przod: FRONT, tyl: BACK }
