import { eq } from 'drizzle-orm'
import type { DbClient } from '../db/index.js'
import { users } from '../db/schema.js'

export type NewUserRow = typeof users.$inferInsert
export type UserRow = typeof users.$inferSelect

/** Returns the user with the given normalized RUT, or undefined when not found. */
export function findUserByRut(db: DbClient, rut: string): UserRow | undefined {
  return db.select().from(users).where(eq(users.rut, rut)).get()
}

/** Inserts a user and returns the new row id. */
export function insertUser(db: DbClient, user: NewUserRow): number {
  return Number(db.insert(users).values(user).run().lastInsertRowid)
}