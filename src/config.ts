import { fileURLToPath } from 'node:url'
import { join, isAbsolute } from 'node:path'

export type AppConfig = {
  port: number
  databasePath: string
  jwtSecret: string
  jwtExpiresSeconds: number
}

/** Development-only fallback; production must set JWT_SECRET. */
const DEV_JWT_SECRET = 'dev-only-secret-do-not-use-in-production'

/** Project root resolved from this module so dev (src/) and build (dist/) land on the same folder. */
export const projectRoot = fileURLToPath(new URL('../', import.meta.url))
export const viewsDir = join(projectRoot, 'views')
export const publicDir = join(projectRoot, 'public')

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = Number(env.PORT ?? 3000)
  const databasePath = env.DATABASE_PATH ?? './data/app.db'
  const jwtSecret = env.JWT_SECRET ?? DEV_JWT_SECRET
  if (jwtSecret === DEV_JWT_SECRET) {
    console.warn('[config] JWT_SECRET no definido; usando secreto de desarrollo (no apto para producción)')
  }
  const jwtExpiresSeconds = Number(env.JWT_EXPIRES_SECONDS ?? 7 * 24 * 60 * 60)

  return {
    port,
    databasePath: isAbsolute(databasePath) ? databasePath : join(projectRoot, databasePath),
    jwtSecret,
    jwtExpiresSeconds,
  }
}