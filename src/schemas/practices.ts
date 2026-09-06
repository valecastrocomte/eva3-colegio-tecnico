import { z } from 'zod'
import type { DbClient } from '../db/index.js'
import { findCompanyById } from '../services/companies.js'
import { findDirectSupervisorById } from '../services/direct-supervisors.js'
import { findUserById } from '../services/users.js'

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Rejects impossible calendar dates such as 2026-13-40. */
function isRealDate(value: string): boolean {
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

const isoDateField = z
  .string()
  .trim()
  .regex(ISO_DATE_PATTERN, 'La fecha debe tener el formato aaaa-mm-dd')
  .refine(isRealDate, 'Ingrese una fecha válida')
  .default('')

/**
 * Validates the practice creation form against every rule of BRIEF.md section 11:
 * FKs must exist and match their role, both dates are required and ordered, and
 * company / direct supervisor data is complete for the selected mode.
 * `requireStudent` enforces a student choice (professor flow); students are
 * always bound to their own account by the route.
 */
export function createPracticeSchema(
  db: DbClient,
  options: { requireStudent: boolean }
) {
  return z
    .object({
      companyMode: z
        .enum(['existing', 'new'], { message: 'Seleccione una opción válida' })
        .default('new'),
      companyId: z.string().trim().default(''),
      companyName: z.string().trim().default(''),
      companyAddress: z.string().trim().default(''),
      companyPhone: z.string().trim().default(''),
      directSupervisorMode: z
        .enum(['existing', 'new'], { message: 'Seleccione una opción válida' })
        .default('new'),
      directSupervisorId: z.string().trim().default(''),
      directSupervisorName: z.string().trim().default(''),
      directSupervisorContact: z.string().trim().default(''),
      directSupervisorPosition: z.string().trim().default(''),
      studentId: z.string().trim().default(''),
      supervisorId: z.string().trim().default(''),
      startDate: isoDateField,
      endDate: isoDateField,
      activityDescription: z
        .string()
        .trim()
        .min(1, 'La descripción de actividades es obligatoria')
        .default(''),
    })
    .superRefine((data, ctx) => {
      const addIssue = (path: string, message: string) =>
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message })

      if (data.companyMode === 'existing') {
        const companyId = Number(data.companyId)
        const validId =
          data.companyId !== '' &&
          Number.isInteger(companyId) &&
          companyId > 0 &&
          findCompanyById(db, companyId) !== undefined
        if (!validId) {
          addIssue('companyId', 'Seleccione una empresa válida')
        }
      } else {
        if (data.companyName === '') {
          addIssue('companyName', 'El nombre de la empresa es obligatorio')
        }
        if (data.companyAddress === '') {
          addIssue('companyAddress', 'La dirección de la empresa es obligatoria')
        }
        if (data.companyPhone === '') {
          addIssue('companyPhone', 'El teléfono de la empresa es obligatorio')
        }
      }

      if (data.directSupervisorMode === 'existing') {
        const directSupervisorId = Number(data.directSupervisorId)
        const validId =
          data.directSupervisorId !== '' &&
          Number.isInteger(directSupervisorId) &&
          directSupervisorId > 0 &&
          findDirectSupervisorById(db, directSupervisorId) !== undefined
        if (!validId) {
          addIssue('directSupervisorId', 'Seleccione un jefe directo válido')
        }
      } else {
        if (data.directSupervisorName === '') {
          addIssue('directSupervisorName', 'El nombre del jefe directo es obligatorio')
        }
        if (data.directSupervisorContact === '') {
          addIssue('directSupervisorContact', 'El contacto del jefe directo es obligatorio')
        }
        if (data.directSupervisorPosition === '') {
          addIssue('directSupervisorPosition', 'El cargo del jefe directo es obligatorio')
        }
      }

      const supervisorId = Number(data.supervisorId)
      const supervisor =
        Number.isInteger(supervisorId) && supervisorId > 0
          ? findUserById(db, supervisorId)
          : undefined
      if (!supervisor || supervisor.role !== 'profesor') {
        addIssue('supervisorId', 'Seleccione un profesor supervisor válido')
      }

      if (options.requireStudent) {
        const studentId = Number(data.studentId)
        const student =
          Number.isInteger(studentId) && studentId > 0
            ? findUserById(db, studentId)
            : undefined
        if (!student || student.role !== 'estudiante') {
          addIssue('studentId', 'Seleccione un estudiante válido')
        }
      }

      if (data.startDate === '') {
        addIssue('startDate', 'La fecha de inicio es obligatoria')
      }
      if (data.endDate === '') {
        addIssue('endDate', 'La fecha de término es obligatoria')
      } else if (data.startDate !== '' && data.endDate < data.startDate) {
        addIssue(
          'endDate',
          'La fecha de término debe ser igual o posterior a la fecha de inicio'
        )
      }
    })
}

export type CreatePracticeInput = z.infer<ReturnType<typeof createPracticeSchema>>