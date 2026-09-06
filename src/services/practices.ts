import { eq } from 'drizzle-orm'
import type { DbClient } from '../db/index.js'
import { practices } from '../db/schema.js'

export type PracticeRow = typeof practices.$inferSelect

/** Returns the practice with the given id, or undefined when it does not exist. */
export function findPracticeById(db: DbClient, id: number): PracticeRow | undefined {
  return db.select().from(practices).where(eq(practices.id, id)).get()
}