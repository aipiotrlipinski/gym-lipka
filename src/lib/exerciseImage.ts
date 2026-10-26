import type { Exercise } from '../db'
import { EXERCISE_IMAGES } from '../data/exerciseImages'

const BASE = import.meta.env.BASE_URL

/** Zdjęcie przypisane do ćwiczenia: wybrane ręcznie (własne ćwiczenia) albo z wbudowanej bazy po nazwie. */
export function exerciseImage(ex?: Pick<Exercise, 'name' | 'image'>): string | undefined {
  if (!ex) return undefined
  return ex.image ?? EXERCISE_IMAGES[ex.name]
}

export const thumbUrl = (slug: string) => `${BASE}ex/t/${slug}.webp`
export const frameUrl = (slug: string, k: 0 | 1) => `${BASE}ex/${slug}-${k}.webp`
