import { fileURLToPath } from 'node:url'
import { join, isAbsolute } from 'node:path'

export type AppConfig = {
  port: number
  databasePath: string
}

/** Project root resolved from this module so dev (src/) and build (dist/) land on the same folder. */
export const projectRoot = fileURLToPath(new URL('../', import.meta.url))
export const viewsDir = join(projectRoot, 'views')
export const publicDir = join(projectRoot, 'public')

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = Number(env.PORT ?? 3000)
  const databasePath = env.DATABASE_PATH ?? './data/app.db'

  return {
    port,
    databasePath: isAbsolute(databasePath) ? databasePath : join(projectRoot, databasePath),
  }
}