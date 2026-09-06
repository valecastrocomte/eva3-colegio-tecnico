import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { migrate as applyMigrations } from 'drizzle-orm/better-sqlite3/migrator'
import type { DbClient } from './index.js'

const migrationsFolder = join(fileURLToPath(new URL('../../drizzle/', import.meta.url)))

export function migrate(db: DbClient): void {
  applyMigrations(db, { migrationsFolder })
}