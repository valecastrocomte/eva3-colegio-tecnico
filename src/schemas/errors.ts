import { z } from 'zod'

/** Maps a ZodError to `{ field: firstMessage }` for the view. */
export function firstFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const issue of error.issues) {
    const field = issue.path[0]
    if (typeof field === 'string' && !(field in errors)) {
      errors[field] = issue.message
    }
  }
  return errors
}