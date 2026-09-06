import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import type { AppEnv } from './types.js'
import { loadConfig, publicDir } from './config.js'
import { createDb } from './db/index.js'
import { ensureBootstrapAssets } from './lib/vendor.js'
import { renderer } from './middleware/renderer.js'

function createApp() {
  const app = new Hono<AppEnv>()

  app.use(
    '/assets/*',
    serveStatic({
      root: publicDir,
      rewriteRequestPath: (path) => path.replace(/^\/assets/, ''),
    })
  )
  app.use('*', renderer)

  app.get('/', (c) =>
    c.var.render('home', {
      title: 'Gestión de Prácticas Profesionales',
    })
  )

  return app
}

const config = loadConfig()
ensureBootstrapAssets()

const db = createDb(config.databasePath)
console.log(`[db] SQLite en ${config.databasePath}`)

const app = createApp()

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`[server] escuchando en http://localhost:${info.port}`)
})