import type { Context } from 'hono'
import type { AppEnv } from '../types.js'

/** Reads a urlencoded/multipart form body into a map of text values. */
export async function readTextForm(c: Context<AppEnv>): Promise<Record<string, string>> {
  const form = await c.req.formData()
  return Object.fromEntries(
    [...form.entries()].map(([key, value]) => [key, typeof value === 'string' ? value : ''])
  )
}