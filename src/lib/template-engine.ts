import Handlebars from 'handlebars'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { TemplateDelegate } from 'handlebars'
import { viewsDir } from '../config.js'
Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b)

const templateCache = new Map<string, TemplateDelegate>()

function loadTemplate(name: string): TemplateDelegate {
  let template = templateCache.get(name)
  if (!template) {
    const source = readFileSync(join(viewsDir, `${name}.hbs`), 'utf8')
    template = Handlebars.compile(source)
    templateCache.set(name, template)
  }
  return template
}

/** Renders a view inside the base layout. Each view receives `body` with its own output. */
export function renderPage(view: string, data: Record<string, unknown> = {}): string {
  const body = loadTemplate(view)(data)
  const layout = loadTemplate('layouts/main')
  return layout({ ...data, body })
}