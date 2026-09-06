import { Hono } from 'hono'
import type { Context } from 'hono'
import type { AppEnv } from '../types.js'
import type { DbClient } from '../db/index.js'
import { normalizeRut } from '../lib/rut.js'
import { hashPassword } from '../lib/password.js'
import { firstFieldErrors, registrationSchema } from '../schemas/auth.js'
import { findUserByRut, insertUser } from '../services/users.js'

export type RegistrationFormValues = {
  rut: string
  fullName: string
  password: string
  role: string
  career: string
  specialty: string
}

const EMPTY_FORM: RegistrationFormValues = {
  rut: '',
  fullName: '',
  password: '',
  role: 'estudiante',
  career: '',
  specialty: '',
}

/** Rebuilds form values from raw submitted fields, preserving whatever the user typed. */
function rawToFormValues(body: Record<string, string>): RegistrationFormValues {
  return {
    rut: body.rut ?? '',
    fullName: body.fullName ?? '',
    password: body.password ?? '',
    role: body.role === 'profesor' ? 'profesor' : 'estudiante',
    career: body.career ?? '',
    specialty: body.specialty ?? '',
  }
}

async function readTextForm(c: Context<AppEnv>): Promise<Record<string, string>> {
  const form = await c.req.formData()
  return Object.fromEntries(
    [...form.entries()].map(([key, value]) => [key, typeof value === 'string' ? value : ''])
  )
}

export function createAuthRoutes(db: DbClient): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  app.get('/registro', (c) =>
    c.var.render('auth/registro', {
      title: 'Registro',
      form: EMPTY_FORM,
      errors: {},
    })
  )

  app.post('/registro', async (c) => {
    const body = await readTextForm(c)

    const parsed = registrationSchema.safeParse(body)
    if (!parsed.success) {
      return c.var.render('auth/registro', {
        title: 'Registro',
        form: rawToFormValues(body),
        errors: firstFieldErrors(parsed.error),
      })
    }

    const values = parsed.data
    const normalizedRut = normalizeRut(values.rut)
    if (!normalizedRut || findUserByRut(db, normalizedRut)) {
      return c.var.render('auth/registro', {
        title: 'Registro',
        form: rawToFormValues(body),
        errors: { rut: 'El RUT ya está registrado' },
      })
    }

    const passwordHash = await hashPassword(values.password)
    insertUser(db, {
      rut: normalizedRut,
      fullName: values.fullName,
      passwordHash,
      role: values.role,
      career: values.role === 'estudiante' ? values.career : null,
      specialty: values.role === 'profesor' ? values.specialty : null,
    })

    return c.var.render('auth/registro', {
      title: 'Registro',
      success: true,
      fullName: values.fullName,
    })
  })

  return app
}