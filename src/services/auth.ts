import type { DbClient } from '../db/index.js'
import type { AppConfig } from '../config.js'
import type { LoginInput, RegistrationInput } from '../schemas/auth.js'
import { findUserByRut, insertUser, type UserRow } from '../repositories/users.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { normalizeRut } from '../lib/rut.js'
import { createSessionToken } from '../lib/session.js'

export type RegisterResult = { ok: true; fullName: string } | { ok: false }

/**
 * Registers a new user: normalizes the RUT, rejects duplicates, hashes the
 * password and stores the role-appropriate profile fields.
 */
export async function registerUser(
  db: DbClient,
  values: RegistrationInput
): Promise<RegisterResult> {
  const normalizedRut = normalizeRut(values.rut)
  if (!normalizedRut || findUserByRut(db, normalizedRut)) {
    return { ok: false }
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

  return { ok: true, fullName: values.fullName }
}

export type LoginResult = { ok: true; token: string; user: UserRow } | { ok: false }

/** Verifies the credentials and, on success, issues a signed session token. */
export async function loginUser(
  db: DbClient,
  values: LoginInput,
  config: AppConfig
): Promise<LoginResult> {
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
    return { ok: false }
  }

  const token = await createSessionToken(
    { id: user.id, role: user.role, name: user.fullName },
    config.jwtSecret,
    config.jwtExpiresSeconds
  )

  return { ok: true, token, user }
}