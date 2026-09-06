import { createMiddleware } from 'hono/factory'
import type { Context } from 'hono'
import type { AppEnv } from '../types.js'
import type { UserRole } from '../schemas/auth.js'
import type { DbClient } from '../db/index.js'
import { findPracticeById } from '../services/practices.js'

/** Renders the authorization error page with an HTTP 403 status. */
function forbidden(c: Context<AppEnv>): Response {
  return c.var.render('error-403', { title: 'Acceso denegado' }, 403)
}

/**
 * Restricts a route to authenticated users holding one of the allowed roles.
 * Unauthenticated requests are redirected to the login page; any other role
 * receives a 403. Usage: `requireRol('profesor')`.
 */
export function requireRol(...allowedRoles: UserRole[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!c.var.currentUser) {
      return c.redirect('/auth/login')
    }
    if (!allowedRoles.includes(c.var.currentUser.role)) {
      return forbidden(c)
    }
    await next()
  })
}

/**
 * Loads the practice named by the `:id` path param and lets the request through
 * only for professors (any practice) or for the student who owns the practice
 * (`studentId === currentUser.id`). A missing practice yields a 404; any other
 * student gets a 403. The loaded practice is exposed as `c.var.practice` so
 * route handlers never reload it.
 */
export function ownerOrProfesor(db: DbClient) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!c.var.currentUser) {
      return c.redirect('/auth/login')
    }

    const id = Number(c.req.param('id'))
    const practice = Number.isInteger(id) && id > 0 ? findPracticeById(db, id) : undefined
    if (!practice) {
      return c.notFound()
    }

    c.set('practice', practice)

    const isOwner = practice.studentId === c.var.currentUser.id
    if (c.var.currentUser.role !== 'profesor' && !isOwner) {
      return forbidden(c)
    }

    await next()
  })
}