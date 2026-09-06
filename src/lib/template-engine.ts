import Handlebars from 'handlebars'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { TemplateDelegate } from 'handlebars'
import { viewsDir } from '../config.js'
Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b)

const partialsDir = join(viewsDir, 'partials')
const templateCache = new Map<string, TemplateDelegate>()

/** Registers every Handlebars partial under `views/partials`, named by relative path (e.g. `practices/practice-form`). */
function registerPartials(dir = partialsDir, prefix = ''): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      registerPartials(fullPath, `${prefix}${entry.name}/`)
    } else if (entry.name.endsWith('.hbs')) {
      Handlebars.registerPartial(`${prefix}${entry.name.slice(0, -4)}`, readFileSync(fullPath, 'utf8'))
    }
  }
}

if (existsSync(partialsDir)) {
  registerPartials()
}

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