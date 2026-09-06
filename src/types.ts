import type { UserRole } from './schemas/auth.js'
import type { PracticeRow } from './repositories/practices.js'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export type SessionUser = {
  id: number
  role: UserRole
  name: string
}

export type AppEnv = {
  Variables: {
    render: (view: string, data?: Record<string, unknown>, status?: ContentfulStatusCode) => Response
    currentUser: SessionUser | null
    practice: PracticeRow | null
  }
}