import { Hono } from 'hono'
import type { Context } from 'hono'
import type { AppEnv } from '../types.js'
import type { DbClient } from '../db/index.js'
import { authRequired } from '../middleware/auth.js'
import { ownerOrProfesor, requireRol } from '../middleware/rbac.js'
import { excerpt, toDisplayDate } from '../lib/display.js'
import { readTextForm } from '../lib/forms.js'
import { firstFieldErrors } from '../schemas/errors.js'
import { createPracticeSchema } from '../schemas/practices.js'
import type { CreatePracticeInput } from '../schemas/practices.js'
import { listUsersByRole } from '../services/users.js'
import { insertCompany, listCompanies } from '../services/companies.js'
import {
  insertDirectSupervisor,
  listDirectSupervisors,
} from '../services/direct-supervisors.js'
import {
  deletePractice,
  findPracticeById,
  findPracticeDetail,
  insertPractice,
  listPractices,
  updatePractice,
} from '../services/practices.js'
import type { PracticeDetailRow, PracticeRow } from '../services/practices.js'

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

/** Prefills the form from an existing practice, keeping its company and direct supervisor selected. */
function practiceToFormValues(practice: PracticeRow): PracticeFormValues {
  return {
    companyMode: 'existing',
    companyId: String(practice.companyId),
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    directSupervisorMode: 'existing',
    directSupervisorId: String(practice.directSupervisorId),
    directSupervisorName: '',
    directSupervisorContact: '',
    directSupervisorPosition: '',
    studentId: String(practice.studentId),
    supervisorId: String(practice.supervisorId),
    startDate: practice.startDate,
    endDate: practice.endDate,
    activityDescription: practice.activityDescription,
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

function toListView(rows: PracticeDetailRow[]) {
  return rows.map((row) => ({
    id: row.id,
    studentName: row.studentName,
    supervisorName: row.supervisorName,
    companyName: row.companyName,
    directSupervisorName: row.directSupervisorName,
    startDate: toDisplayDate(row.startDate),
    endDate: toDisplayDate(row.endDate),
    activityDescription: excerpt(row.activityDescription),
  }))
}

/** Resolves the company and direct supervisor ids for a validated form (create or update). */
function resolveCompanyAndDirectSupervisor(db: DbClient, values: CreatePracticeInput) {
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
  return { companyId, directSupervisorId }
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
      submitLabel: 'Guardar práctica',
      showBackButton: true,
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
        submitLabel: 'Guardar práctica',
        showBackButton: true,
      })
    }

    const values = parsed.data
    const { companyId, directSupervisorId } = resolveCompanyAndDirectSupervisor(db, values)

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

  app.get('/:id', ownerOrProfesor(db), (c) => {
    const practice = c.var.practice
    if (!practice) return c.notFound()
    const detail = findPracticeDetail(db, practice.id)
    if (!detail) return c.notFound()

    return c.var.render('practices/detail', {
      title: 'Detalle de la práctica',
      practice: {
        ...detail,
        startDate: toDisplayDate(detail.startDate),
        endDate: toDisplayDate(detail.endDate),
      },
    })
  })

  app.get('/:id/editar', requireRol('profesor'), (c) => {
    const id = practiceId(c)
    if (Number.isNaN(id)) return c.notFound()
    const practice = findPracticeById(db, id)
    if (!practice) return c.notFound()

    return c.var.render('practices/editar', {
      title: 'Editar práctica',
      practiceId: practice.id,
      form: practiceToFormValues(practice),
      errors: {},
      options: loadFormOptions(db),
      submitLabel: 'Guardar cambios',
    })
  })

  app.post('/:id', requireRol('profesor'), async (c) => {
    const id = practiceId(c)
    if (Number.isNaN(id)) return c.notFound()
    const current = findPracticeById(db, id)
    if (!current) return c.notFound()

    const body = await readTextForm(c)
    const parsed = createPracticeSchema(db, { requireStudent: true }).safeParse(body)

    if (!parsed.success) {
      return c.var.render('practices/editar', {
        title: 'Editar práctica',
        practiceId: id,
        form: rawToFormValues(body),
        errors: firstFieldErrors(parsed.error),
        options: loadFormOptions(db),
        submitLabel: 'Guardar cambios',
      })
    }

    const values = parsed.data
    const { companyId, directSupervisorId } = resolveCompanyAndDirectSupervisor(db, values)
    updatePractice(db, id, {
      studentId: Number(values.studentId),
      supervisorId: Number(values.supervisorId),
      companyId,
      directSupervisorId,
      startDate: values.startDate,
      endDate: values.endDate,
      activityDescription: values.activityDescription,
    })

    return c.redirect('/practicas')
  })

  app.post('/:id/eliminar', requireRol('profesor'), (c) => {
    const id = practiceId(c)
    if (Number.isNaN(id)) return c.notFound()
    if (!findPracticeById(db, id)) return c.notFound()

    deletePractice(db, id)
    return c.redirect('/practicas')
  })

  return app
}

/** Reads the `:id` path param as a positive integer (NaN otherwise). */
function practiceId(c: Context<AppEnv>): number {
  const value = Number(c.req.param('id'))
  return Number.isInteger(value) && value > 0 ? value : NaN
}