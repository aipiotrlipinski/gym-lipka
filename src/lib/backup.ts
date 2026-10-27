import { db } from '../db'

/**
 * Kopia zapasowa: cała baza w jednym pliku JSON.
 * Służy też do przeniesienia danych z wersji przeglądarkowej do aplikacji APK.
 */

const TABLES = ['exercises', 'plans', 'planDays', 'workouts', 'sets', 'body'] as const
type TableName = (typeof TABLES)[number]

export interface Backup {
  app: 'gym-lipka'
  format: 1
  exportedAt: number
  data: Record<TableName, unknown[]>
}

export interface BackupSummary {
  exportedAt: number
  workouts: number
  sets: number
  plans: number
  body: number
}

export class BackupError extends Error {}

export async function exportBackup(): Promise<Backup> {
  const data = {} as Record<TableName, unknown[]>
  await db.transaction('r', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) data[t] = await db.table(t).toArray()
  })
  return { app: 'gym-lipka', format: 1, exportedAt: Date.now(), data }
}

export function backupFileName(at = Date.now()) {
  const d = new Date(at)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `gym-lipka-kopia-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`
}

/** Sprawdza plik i zwraca kopię gotową do wgrania. Rzuca BackupError z komunikatem dla użytkownika. */
export function parseBackup(text: string): Backup {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new BackupError('To nie jest plik kopii Gym Lipka.')
  }
  const b = raw as Partial<Backup>
  if (!b || b.app !== 'gym-lipka' || typeof b.data !== 'object' || b.data === null) {
    throw new BackupError('To nie jest plik kopii Gym Lipka.')
  }
  if (b.format !== 1) throw new BackupError('Ta kopia pochodzi z nowszej wersji aplikacji. Zaktualizuj aplikację.')
  for (const t of TABLES) {
    const rows = (b.data as Record<string, unknown>)[t]
    if (!Array.isArray(rows) || rows.some((r) => typeof r !== 'object' || r === null || typeof (r as { id?: unknown }).id !== 'number')) {
      throw new BackupError('Plik kopii jest uszkodzony.')
    }
  }
  if (b.data.exercises.length === 0) throw new BackupError('Plik kopii jest pusty.')
  return b as Backup
}

export function summarize(b: Backup): BackupSummary {
  const workouts = (b.data.workouts as { status?: string }[]).filter((w) => w.status === 'zakończony').length
  return {
    exportedAt: b.exportedAt,
    workouts,
    sets: b.data.sets.length,
    plans: b.data.plans.length,
    body: b.data.body.length,
  }
}

/** Zastępuje całą bazę zawartością kopii — w jednej transakcji, więc przy błędzie nic się nie zmienia. */
export async function restoreBackup(b: Backup) {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear()
      await db.table(t).bulkAdd(b.data[t])
    }
  })
}
