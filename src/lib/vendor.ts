import { cpSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { publicDir, projectRoot } from '../config.js'

const bootstrapDistDir = join(projectRoot, 'node_modules', 'bootstrap', 'dist')
const vendorTargetDir = join(publicDir, 'vendor', 'bootstrap')

/** Copies Bootstrap's dist assets into public/vendor once so the app runs without a CDN. */
export function ensureBootstrapAssets(): void {
  if (existsSync(vendorTargetDir)) return
  cpSync(bootstrapDistDir, vendorTargetDir, { recursive: true })
}