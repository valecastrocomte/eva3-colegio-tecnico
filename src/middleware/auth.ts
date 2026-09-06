import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import type { AppEnv } from '../types.js'
import { parseSessionToken, SESSION_COOKIE } from '../lib/session.js'

/** Resolves the session cookie into `c.var.currentUser` (null when absent or invalid). */
export function createAttachUser(secret: string) {
  return createMiddleware<AppEnv>(async (c, next) => {
    c.set('currentUser', await parseSessionToken(getCookie(c, SESSION_COOKIE), secret))
    await next()
  })
}

/** Rejects unauthenticated requests by redirecting to the login page. */
export const authRequired = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.var.currentUser) {
    return c.redirect('/auth/login')
  }
  await next()
})