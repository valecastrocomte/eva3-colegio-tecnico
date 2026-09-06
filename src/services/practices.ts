import { aliasedTable, desc, eq } from 'drizzle-orm'
import type { DbClient } from '../db/index.js'
import { companies, directSupervisors, practices, users } from '../db/schema.js'

export type PracticeRow = typeof practices.$inferSelect
export type NewPracticeRow = typeof practices.$inferInsert

/** A practice joined with its related rows (names, contact data and careers). */
export type PracticeDetailRow = {
  id: number
  startDate: string
  endDate: string
  activityDescription: string
  studentName: string
  studentCareer: string | null
  supervisorName: string
  supervisorSpecialty: string | null
  companyName: string
  companyAddress: string
  companyPhone: string
  directSupervisorName: string
  directSupervisorContact: string
  directSupervisorPosition: string
}

/** Full join of practices with their student, supervisor, company and direct supervisor. */
function practiceQuery(db: DbClient) {
  const student = aliasedTable(users, 'estudiante')
  const supervisor = aliasedTable(users, 'profesor')
  return db
    .select({
      id: practices.id,
      startDate: practices.startDate,
      endDate: practices.endDate,
      activityDescription: practices.activityDescription,
      studentName: student.fullName,
      studentCareer: student.career,
      supervisorName: supervisor.fullName,
      supervisorSpecialty: supervisor.specialty,
      companyName: companies.name,
      companyAddress: companies.address,
      companyPhone: companies.phone,
      directSupervisorName: directSupervisors.name,
      directSupervisorContact: directSupervisors.contact,
      directSupervisorPosition: directSupervisors.position,
    })
    .from(practices)
    .innerJoin(student, eq(practices.studentId, student.id))
    .innerJoin(supervisor, eq(practices.supervisorId, supervisor.id))
    .innerJoin(companies, eq(practices.companyId, companies.id))
    .innerJoin(directSupervisors, eq(practices.directSupervisorId, directSupervisors.id))
}

export function findPracticeDetail(db: DbClient, id: number): PracticeDetailRow | undefined {
  return practiceQuery(db).where(eq(practices.id, id)).get()
}

export function listPractices(
  db: DbClient,
  filters: { studentId?: number } = {}
): PracticeDetailRow[] {
  const query = practiceQuery(db)
  if (filters.studentId !== undefined) {
    return query
      .where(eq(practices.studentId, filters.studentId))
      .orderBy(desc(practices.startDate), desc(practices.id))
      .all()
  }
  return query.orderBy(desc(practices.startDate), desc(practices.id)).all()
}

/** Returns the practice with the given id, or undefined when it does not exist. */
export function findPracticeById(db: DbClient, id: number): PracticeRow | undefined {
  return db.select().from(practices).where(eq(practices.id, id)).get()
}

/** Inserts a practice and returns the new row id. */
export function insertPractice(db: DbClient, practice: NewPracticeRow): number {
  return Number(db.insert(practices).values(practice).run().lastInsertRowid)
}

/** Updates the practice with the given id with the provided fields. */
export function updatePractice(db: DbClient, id: number, values: Partial<NewPracticeRow>): void {
  db.update(practices).set(values).where(eq(practices.id, id)).run()
}

/** Physically deletes the practice with the given id. */
export function deletePractice(db: DbClient, id: number): void {
  db.delete(practices).where(eq(practices.id, id)).run()
}