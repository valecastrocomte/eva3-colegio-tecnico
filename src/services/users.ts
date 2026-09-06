import { asc, eq } from 'drizzle-orm'
import type { DbClient } from '../db/index.js'
import { users } from '../db/schema.js'
import type { UserRole } from '../schemas/auth.js'

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

/** Returns the user with the given id, or undefined when not found. */
export function findUserById(db: DbClient, id: number): UserRow | undefined {
  return db.select().from(users).where(eq(users.id, id)).get()
}

/** Returns all users holding the given role, ordered by name. */
export function listUsersByRole(db: DbClient, role: UserRole): UserRow[] {
  return db.select().from(users).where(eq(users.role, role)).orderBy(asc(users.fullName)).all()
}