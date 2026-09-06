import { z } from 'zod'
import { normalizeRut } from '../lib/rut.js'

export const ROLES = ['estudiante', 'profesor'] as const
export type UserRole = (typeof ROLES)[number]

const rutField = z
  .string()
  .trim()
  .min(1, 'El RUT es obligatorio')
  .refine(
    (value) => normalizeRut(value) !== null,
    'El RUT no es válido: revise el formato y el dígito verificador'
  )

export const registrationSchema = z
  .object({
    rut: rutField,
    fullName: z.string().trim().min(1, 'El nombre completo es obligatorio'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    role: z.enum(ROLES, { message: 'Seleccione un tipo de cuenta válido' }),
    career: z.string().trim().optional().default(''),
    specialty: z.string().trim().optional().default(''),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'estudiante' && data.career === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['career'],
        message: 'La carrera es obligatoria para estudiantes',
      })
    }
    if (data.role === 'profesor' && data.specialty === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['specialty'],
        message: 'La especialidad es obligatoria para profesores',
      })
    }
  })

export type RegistrationInput = z.infer<typeof registrationSchema>

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

export const loginSchema = z.object({
  rut: z.string().trim().min(1, 'El RUT es obligatorio'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

export type LoginInput = z.infer<typeof loginSchema>