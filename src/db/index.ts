import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'

export type DbClient = BetterSQLite3Database

export function createDb(databasePath: string): DbClient {
  mkdirSync(dirname(databasePath), { recursive: true })

  const sqlite = new Database(databasePath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  return drizzle(sqlite)
}