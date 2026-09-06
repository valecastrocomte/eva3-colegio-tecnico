import { Hono } from 'hono'
import type { Context } from 'hono'
import type { AppEnv } from '../types.js'
import type { DbClient } from '../db/index.js'
import { authRequired } from '../middleware/auth.js'
import { excerpt, toDisplayDate } from '../lib/display.js'
import { readTextForm } from '../lib/forms.js'
import { firstFieldErrors } from '../schemas/errors.js'
import { createPracticeSchema } from '../schemas/practices.js'
import { listUsersByRole } from '../services/users.js'
import { insertCompany, listCompanies } from '../services/companies.js'
import {
  insertDirectSupervisor,
  listDirectSupervisors,
} from '../services/direct-supervisors.js'
import { insertPractice, listPractices } from '../services/practices.js'
import type { PracticeListRow } from '../services/practices.js'

export type PracticeFormValues = {
  companyMode: string
  companyId: string
  companyName: string
  companyAddress: string
  companyPhone: string
  directSupervisorMode: string
  directSupervisorId: string
  directSupervisorName: string
  directSupervisorContact: string
  directSupervisorPosition: string
  studentId: string
  supervisorId: string
  startDate: string
  endDate: string
  activityDescription: string
}

type SelectOption = { id: string; name: string }

type FormOptions = {
  students: SelectOption[]
  professors: SelectOption[]
  companies: SelectOption[]
  directSupervisors: SelectOption[]
}

const EMPTY_FORM: PracticeFormValues = {
  companyMode: 'new',
  companyId: '',
  companyName: '',
  companyAddress: '',
  companyPhone: '',
  directSupervisorMode: 'new',
  directSupervisorId: '',
  directSupervisorName: '',
  directSupervisorContact: '',
  directSupervisorPosition: '',
  studentId: '',
  supervisorId: '',
  startDate: '',
  endDate: '',
  activityDescription: '',
}

/** Rebuilds form values from raw submitted fields, preserving whatever the user typed. */
function rawToFormValues(body: Record<string, string>): PracticeFormValues {
  return {
    companyMode: body.companyMode === 'existing' ? 'existing' : 'new',
    companyId: body.companyId ?? '',
    companyName: body.companyName ?? '',
    companyAddress: body.companyAddress ?? '',
    companyPhone: body.companyPhone ?? '',
    directSupervisorMode: body.directSupervisorMode === 'existing' ? 'existing' : 'new',
    directSupervisorId: body.directSupervisorId ?? '',
    directSupervisorName: body.directSupervisorName ?? '',
    directSupervisorContact: body.directSupervisorContact ?? '',
    directSupervisorPosition: body.directSupervisorPosition ?? '',
    studentId: body.studentId ?? '',
    supervisorId: body.supervisorId ?? '',
    startDate: body.startDate ?? '',
    endDate: body.endDate ?? '',
    activityDescription: body.activityDescription ?? '',
  }
}

function toSelectOption(rows: { id: number; name: string }[]): SelectOption[] {
  return rows.map((row) => ({ id: String(row.id), name: row.name }))
}

function loadFormOptions(db: DbClient): FormOptions {
  return {
    students: toSelectOption(
      listUsersByRole(db, 'estudiante').map((user) => ({ id: user.id, name: user.fullName }))
    ),
    professors: toSelectOption(
      listUsersByRole(db, 'profesor').map((user) => ({ id: user.id, name: user.fullName }))
    ),
    companies: toSelectOption(listCompanies(db)),
    directSupervisors: toSelectOption(listDirectSupervisors(db)),
  }
}

function toListView(rows: PracticeListRow[]) {
  return rows.map((row) => ({
    studentName: row.studentName,
    supervisorName: row.supervisorName,
    companyName: row.companyName,
    directSupervisorName: row.directSupervisorName,
    startDate: toDisplayDate(row.startDate),
    endDate: toDisplayDate(row.endDate),
    activityDescription: excerpt(row.activityDescription),
  }))
}

export function createPracticesRoutes(db: DbClient): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  app.use('*', authRequired)

  app.get('/', (c) => {
    const currentUser = c.var.currentUser
    if (!currentUser) return c.redirect('/auth/login')

    const isStudent = currentUser.role === 'estudiante'
    return c.var.render('practices/list', {
      title: isStudent ? 'Mis prácticas' : 'Todas las prácticas',
      emptyMessage: isStudent
        ? 'Aún no has registrado ninguna práctica. Crea la primera desde aquí.'
        : 'Aún no hay prácticas registradas en el sistema. Crea la primera desde aquí.',
      practices: toListView(
        listPractices(db, isStudent ? { studentId: currentUser.id } : undefined)
      ),
    })
  })

  app.get('/nueva', (c) => {
    const currentUser = c.var.currentUser
    if (!currentUser) return c.redirect('/auth/login')

    return c.var.render('practices/nueva', {
      title: 'Nueva práctica',
      form: EMPTY_FORM,
      errors: {},
      options: loadFormOptions(db),
    })
  })

  app.post('/', async (c) => {
    const currentUser = c.var.currentUser
    if (!currentUser) return c.redirect('/auth/login')

    const body = await readTextForm(c)
    const schema = createPracticeSchema(db, {
      requireStudent: currentUser.role === 'profesor',
    })
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return c.var.render('practices/nueva', {
        title: 'Nueva práctica',
        form: rawToFormValues(body),
        errors: firstFieldErrors(parsed.error),
        options: loadFormOptions(db),
      })
    }

    const values = parsed.data
    // Number() is safe here: the schema only admits existing ids for each mode.
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

    // The student can never pick a different owner: the account is forced server-side.
    insertPractice(db, {
      studentId: currentUser.role === 'estudiante' ? currentUser.id : Number(values.studentId),
      supervisorId: Number(values.supervisorId),
      companyId,
      directSupervisorId,
      startDate: values.startDate,
      endDate: values.endDate,
      activityDescription: values.activityDescription,
    })

    return c.redirect('/practicas')
  })

  return app
}