import { createMiddleware } from 'hono/factory'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { AppEnv } from '../types.js'
import { renderPage } from '../lib/template-engine.js'

/** Exposes `c.var.render(view, data, status)`, rendering a Handlebars view inside the base layout. */
export const renderer = createMiddleware<AppEnv>(async (c, next) => {
  c.set('render', (view, data = {}, status: ContentfulStatusCode = 200) =>
    c.html(renderPage(view, { currentUser: c.var.currentUser ?? null, ...data }), status)
  )
  await next()
})