import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import type { AppEnv } from './types.js'
import { loadConfig, publicDir } from './config.js'
import { createDb } from './db/index.js'
import { migrate } from './db/migrate.js'
import { ensureBootstrapAssets } from './lib/vendor.js'
import { createAuthRoutes } from './routes/auth.js'
import { createAttachUser } from './middleware/auth.js'
import { renderer } from './middleware/renderer.js'
import type { AppConfig } from './config.js'

function createApp(config: AppConfig) {
  const app = new Hono<AppEnv>()

  app.use(
    '/assets/*',
    serveStatic({
      root: publicDir,
      rewriteRequestPath: (path) => path.replace(/^\/assets/, ''),
    })
  )
  app.use('*', createAttachUser(config.jwtSecret))
  app.use('*', renderer)

  app.get('/', (c) =>
    c.var.render('home', {
      title: 'Gestión de Prácticas Profesionales',
    })
  )

  app.route('/auth', createAuthRoutes(db, config))

  app.get('/health', (c) => {
    try {
      db.run(sql`select 1`)
      return c.json({ status: 'ok', db: 'connected' })
    } catch (error) {
      console.error('[db] fallo de conexión:', error)
      return c.json({ status: 'error', db: 'disconnected' }, 503)
    }
  })

  return app
}

const config = loadConfig()
ensureBootstrapAssets()

const db = createDb(config.databasePath)
const app = createApp(config)
console.log(`[db] SQLite en ${config.databasePath}`)


serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`[server] escuchando en http://localhost:${info.port}`)
})