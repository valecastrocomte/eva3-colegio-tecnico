export type AppEnv = {
  Variables: {
    render: (view: string, data?: Record<string, unknown>) => Response
  }
}