import { sign, verify } from 'hono/jwt'
import type { SessionUser } from '../types.js'
import { ROLES, type UserRole } from '../schemas/auth.js'

export const SESSION_COOKIE = 'session'

type SessionClaims = {
  sub: string
  role: UserRole
  name: string
  iat: number
  exp: number
}

/** Signs a JWT carrying the user id (`sub`), role and name, with an `exp` claim. */
export function createSessionToken(
  user: { id: number; role: UserRole; name: string },
  secret: string,
  expiresInSeconds: number
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return sign({ ...user, sub: String(user.id), iat: now, exp: now + expiresInSeconds }, secret)
}

/** Verifies and decodes a session token; returns null for missing, malformed or expired tokens. */
export async function parseSessionToken(
  token: string | undefined,
  secret: string
): Promise<SessionUser | null> {
  if (!token) return null
  try {
    const payload = (await verify(token, secret, 'HS256')) as Partial<SessionClaims>
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.role !== 'string' ||
      typeof payload.name !== 'string' ||
      !ROLES.includes(payload.role)
    ) {
      return null
    }
    const id = Number(payload.sub)
    if (!Number.isInteger(id) || id <= 0) return null
    return { id, role: payload.role, name: payload.name }
  } catch {
    return null
  }
}