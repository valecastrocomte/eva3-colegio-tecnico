import * as argon2 from 'argon2'

/** Hashes a password with Argon2id using the library's secure defaults. */
export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password)
}