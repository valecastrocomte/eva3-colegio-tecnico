import type { DbClient } from '../db/index.js'
import type { UserRole } from '../schemas/auth.js'
import type { CreatePracticeInput } from '../schemas/practices.js'
import { insertCompany } from '../repositories/companies.js'
import { insertDirectSupervisor } from '../repositories/direct-supervisors.js'
import {
  insertPractice,
  updatePractice as updatePracticeRow,
} from '../repositories/practices.js'

type ResolvedRelations = { companyId: number; directSupervisorId: number }

/**
 * Reuses the selected company and direct supervisor, or inserts the new ones
 * when the form mode is 'new'. Only reachable with validated input: the schema
 * guarantees existing ids exist for 'existing' mode and required fields for
 * 'new'.
 */
function resolveCompanyAndDirectSupervisor(
  db: DbClient,
  values: CreatePracticeInput
): ResolvedRelations {
  const companyId =
    values.companyMode === 'existing'
      ? Number(values.companyId)
      : insertCompany(db, {
          name: values.companyName,
          address: values.companyAddress,
          phone: values.companyPhone,
        })
  const directSupervisorId =
    values.directSupervisorMode === 'existing'
      ? Number(values.directSupervisorId)
      : insertDirectSupervisor(db, {
          name: values.directSupervisorName,
          contact: values.directSupervisorContact,
          position: values.directSupervisorPosition,
        })
  return { companyId, directSupervisorId }
}

/**
 * Creates a practice atomically: the company and direct supervisor inserts
 * (when the form mode is 'new') commit together with the practice row, so a
 * failure never leaves orphan rows. The student is always bound to their own
 * account server-side — professors may pick any student, estudiantes never
 * pick one.
 */
export function createPractice(
  db: DbClient,
  currentUser: { id: number; role: UserRole },
  values: CreatePracticeInput
): number {
  return db.transaction((tx) => {
    const { companyId, directSupervisorId } = resolveCompanyAndDirectSupervisor(tx, values)
    return insertPractice(tx, {
      studentId: currentUser.role === 'estudiante' ? currentUser.id : Number(values.studentId),
      supervisorId: Number(values.supervisorId),
      companyId,
      directSupervisorId,
      startDate: values.startDate,
      endDate: values.endDate,
      activityDescription: values.activityDescription,
    })
  })
}

/** Updates a practice atomically, resolving its company and direct supervisor
 * relations inside the same transaction as the row update. */
export function updatePractice(
  db: DbClient,
  id: number,
  values: CreatePracticeInput
): void {
  db.transaction((tx) => {
    const { companyId, directSupervisorId } = resolveCompanyAndDirectSupervisor(tx, values)
    updatePracticeRow(tx, id, {
      studentId: Number(values.studentId),
      supervisorId: Number(values.supervisorId),
      companyId,
      directSupervisorId,
      startDate: values.startDate,
      endDate: values.endDate,
      activityDescription: values.activityDescription,
    })
  })
}