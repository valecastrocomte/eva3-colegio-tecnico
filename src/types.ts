import type { UserRole } from './schemas/auth.js'

export type SessionUser = {
  id: number
  role: UserRole
  name: string
}

export type AppEnv = {
  Variables: {
    render: (view: string, data?: Record<string, unknown>) => Response
    currentUser: SessionUser | null
  }
}