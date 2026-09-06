/**
 * Chilean RUT (Rol Único Tributario) helpers.
 * Canonical stored format: XX.XXX.XXX-X (BRIEF.md section 6.1).
 */

const BODY_DIGITS = 8
/** Check-digit weights repeat 2..7 starting from the rightmost digit. */
const VERIFIER_BASE = 2
const VERIFIER_CYCLE = 6

/** Strips separators and uppercases: '12.345.678-9' → '123456789'. */
export function stripRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase()
}

function computeVerifier(body: string): string {
  const sum = [...body].reduce((acc, digit, index) => {
    const weight = VERIFIER_BASE + ((BODY_DIGITS - 1 - index) % VERIFIER_CYCLE)
    return acc + Number(digit) * weight
  }, 0)
  const verifier = (11 - (sum % 11)) % 11
  return verifier === 10 ? 'K' : String(verifier)
}

/** Returns true when the RUT shape and its check digit are valid. */
export function isValidRut(rut: string): boolean {
  const match = /^(\d{1,8})([0-9K])$/.exec(stripRut(rut))
  if (!match) return false
  const body = match[1]!.padStart(BODY_DIGITS, '0')
  return computeVerifier(body) === match[2]
}

/** Normalizes to the canonical format; returns null when the RUT is invalid. */
export function normalizeRut(rut: string): string | null {
  if (!isValidRut(rut)) return null
  const stripped = stripRut(rut)
  const body = stripped.slice(0, -1).padStart(BODY_DIGITS, '0')
  const verifier = stripped.slice(-1)
  return `${body.slice(0, 2)}.${body.slice(2, 5)}.${body.slice(5)}-${verifier}`
}