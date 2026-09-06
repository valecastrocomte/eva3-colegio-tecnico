import { Hono } from 'hono'
import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { AppEnv } from '../types.js'
import type { AppConfig } from '../config.js'
import type { DbClient } from '../db/index.js'
import { normalizeRut } from '../lib/rut.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { createSessionToken, SESSION_COOKIE } from '../lib/session.js'
import { readTextForm } from '../lib/forms.js'
import { firstFieldErrors } from '../schemas/errors.js'
import { loginSchema, registrationSchema } from '../schemas/auth.js'
import { findUserByRut, insertUser } from '../services/users.js'
import { authRequired } from '../middleware/auth.js'

export type RegistrationFormValues = {
  rut: string
  fullName: string
  password: string
  role: string
  career: string
  specialty: string
}

export type LoginFormValues = {
  rut: string
  password: string
}

const EMPTY_FORM: RegistrationFormValues = {
  rut: '',
  fullName: '',
  password: '',
  role: 'estudiante',
  career: '',
  specialty: '',
}

/** Rebuilds registration form values from raw submitted fields, preserving whatever the user typed. */
function rawToRegistrationValues(body: Record<string, string>): RegistrationFormValues {
  return {
    rut: body.rut ?? '',
    fullName: body.fullName ?? '',
    password: body.password ?? '',
    role: body.role === 'profesor' ? 'profesor' : 'estudiante',
    career: body.career ?? '',
    specialty: body.specialty ?? '',
  }
}

function rawToLoginValues(body: Record<string, string>): LoginFormValues {
  return {
    rut: body.rut ?? '',
    password: body.password ?? '',
  }
}


export function createAuthRoutes(db: DbClient, config: AppConfig): Hono<AppEnv> {
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
        form: rawToRegistrationValues(body),
        errors: firstFieldErrors(parsed.error),
      })
    }

    const values = parsed.data
    const normalizedRut = normalizeRut(values.rut)
    if (!normalizedRut || findUserByRut(db, normalizedRut)) {
      return c.var.render('auth/registro', {
        title: 'Registro',
        form: rawToRegistrationValues(body),
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

  app.get('/login', (c) => {
    if (c.var.currentUser) {
      return c.redirect('/')
    }
    return c.var.render('auth/login', {
      title: 'Iniciar sesión',
      form: { rut: '', password: '' },
      errors: {},
    })
  })

  app.post('/login', async (c) => {
    const body = await readTextForm(c)

    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return c.var.render('auth/login', {
        title: 'Iniciar sesión',
        form: rawToLoginValues(body),
        errors: firstFieldErrors(parsed.error),
      })
    }

    const values = parsed.data
    const normalizedRut = normalizeRut(values.rut)
    const user = normalizedRut ? findUserByRut(db, normalizedRut) : undefined

    let passwordMatches = false
    if (user) {
      try {
        passwordMatches = await verifyPassword(values.password, user.passwordHash)
      } catch {
        passwordMatches = false
      }
    }

    if (!user || !passwordMatches) {
      return c.var.render('auth/login', {
        title: 'Iniciar sesión',
        form: rawToLoginValues(body),
        errors: { credentials: 'RUT o contraseña incorrectos' },
      })
    }

    const token = await createSessionToken(
      { id: user.id, role: user.role, name: user.fullName },
      config.jwtSecret,
      config.jwtExpiresSeconds
    )
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: config.jwtExpiresSeconds,
    })
    return c.redirect('/')
  })

  app.post('/logout', authRequired, (c) => {
    deleteCookie(c, SESSION_COOKIE, { path: '/' })
    return c.redirect('/')
  })

  return app
}