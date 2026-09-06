import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../types.js'
import { renderPage } from '../lib/template-engine.js'

/** Exposes `c.var.render(view, data)`, rendering a Handlebars view inside the base layout. */
export const renderer = createMiddleware<AppEnv>(async (c, next) => {
  c.set('render', (view, data = {}) => c.html(renderPage(view, data)))
  await next()
})