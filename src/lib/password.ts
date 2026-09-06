import * as argon2 from 'argon2'

/** Hashes a password with Argon2id using the library's secure defaults. */
export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password)
}

/** Verifies a password against an Argon2id hash; throws on malformed hashes. */
export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, password)
}