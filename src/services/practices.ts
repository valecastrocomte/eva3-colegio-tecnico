import { aliasedTable, desc, eq } from 'drizzle-orm'
import type { DbClient } from '../db/index.js'
import { companies, directSupervisors, practices, users } from '../db/schema.js'

export type PracticeRow = typeof practices.$inferSelect
export type NewPracticeRow = typeof practices.$inferInsert

/** A practice joined with its related rows, ready for list rendering. */
export type PracticeListRow = {
  id: number
  startDate: string
  endDate: string
  activityDescription: string
  studentName: string
  supervisorName: string
  companyName: string
  directSupervisorName: string
}

/** Returns the practice with the given id, or undefined when it does not exist. */
export function findPracticeById(db: DbClient, id: number): PracticeRow | undefined {
  return db.select().from(practices).where(eq(practices.id, id)).get()
}

/**
 * Lists practices joined with student, supervisor, company and direct supervisor.
 * Pass `studentId` to scope the listing to one student (RBAC for the student role).
 */
export function listPractices(
  db: DbClient,
  filters: { studentId?: number } = {}
): PracticeListRow[] {
  const student = aliasedTable(users, 'estudiante')
  const supervisor = aliasedTable(users, 'profesor')

  const query = db
    .select({
      id: practices.id,
      startDate: practices.startDate,
      endDate: practices.endDate,
      activityDescription: practices.activityDescription,
      studentName: student.fullName,
      supervisorName: supervisor.fullName,
      companyName: companies.name,
      directSupervisorName: directSupervisors.name,
    })
    .from(practices)
    .innerJoin(student, eq(practices.studentId, student.id))
    .innerJoin(supervisor, eq(practices.supervisorId, supervisor.id))
    .innerJoin(companies, eq(practices.companyId, companies.id))
    .innerJoin(directSupervisors, eq(practices.directSupervisorId, directSupervisors.id))

  const scoped =
    filters.studentId !== undefined
      ? query.where(eq(practices.studentId, filters.studentId))
      : query

  return scoped.orderBy(desc(practices.startDate), desc(practices.id)).all()
}

/** Inserts a practice and returns the new row id. */
export function insertPractice(db: DbClient, practice: NewPracticeRow): number {
  return Number(db.insert(practices).values(practice).run().lastInsertRowid)
}