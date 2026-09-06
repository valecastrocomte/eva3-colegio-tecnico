import { asc, eq } from 'drizzle-orm'
import type { DbClient } from '../db/index.js'
import { companies } from '../db/schema.js'

export type CompanyRow = typeof companies.$inferSelect
export type NewCompanyRow = typeof companies.$inferInsert

/** Returns all companies ordered by name. */
export function listCompanies(db: DbClient): CompanyRow[] {
  return db.select().from(companies).orderBy(asc(companies.name)).all()
}

/** Returns the company with the given id, or undefined when it does not exist. */
export function findCompanyById(db: DbClient, id: number): CompanyRow | undefined {
  return db.select().from(companies).where(eq(companies.id, id)).get()
}

/** Inserts a company and returns the new row id. */
export function insertCompany(db: DbClient, company: NewCompanyRow): number {
  return Number(db.insert(companies).values(company).run().lastInsertRowid)
}