import { asc, eq } from 'drizzle-orm'
import type { DbClient } from '../db/index.js'
import { directSupervisors } from '../db/schema.js'

export type DirectSupervisorRow = typeof directSupervisors.$inferSelect
export type NewDirectSupervisorRow = typeof directSupervisors.$inferInsert

/** Returns all direct supervisors ordered by name. */
export function listDirectSupervisors(db: DbClient): DirectSupervisorRow[] {
  return db.select().from(directSupervisors).orderBy(asc(directSupervisors.name)).all()
}

/** Returns the direct supervisor with the given id, or undefined when it does not exist. */
export function findDirectSupervisorById(db: DbClient, id: number): DirectSupervisorRow | undefined {
  return db.select().from(directSupervisors).where(eq(directSupervisors.id, id)).get()
}

/** Inserts a direct supervisor and returns the new row id. */
export function insertDirectSupervisor(db: DbClient, supervisor: NewDirectSupervisorRow): number {
  return Number(db.insert(directSupervisors).values(supervisor).run().lastInsertRowid)
}