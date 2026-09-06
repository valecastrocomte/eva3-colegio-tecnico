import { sql } from 'drizzle-orm'
import { check, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * Database schema for the professional internship management system.
 * Table and column names follow the product spec (BRIEF.md section 6);
 * TypeScript identifiers are in English.
 */

export const users = sqliteTable('usuarios', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  rut: text('rut').notNull().unique(),
  fullName: text('nombre_completo').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('rol', { enum: ['estudiante', 'profesor'] }).notNull(),
  career: text('carrera'),
  specialty: text('especialidad'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})

export const companies = sqliteTable('empresas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('nombre').notNull(),
  address: text('direccion').notNull(),
  phone: text('telefono').notNull(),
})

export const directSupervisors = sqliteTable('jefes_directos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('nombre').notNull(),
  contact: text('contacto').notNull(),
  position: text('cargo').notNull(),
})

export const practices = sqliteTable(
  'practicas',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    studentId: integer('estudiante_id')
      .notNull()
      .references(() => users.id),
    supervisorId: integer('profesor_supervisor_id')
      .notNull()
      .references(() => users.id),
    companyId: integer('empresa_id')
      .notNull()
      .references(() => companies.id),
    directSupervisorId: integer('jefe_directo_id')
      .notNull()
      .references(() => directSupervisors.id),
    startDate: text('fecha_inicio').notNull(),
    endDate: text('fecha_termino').notNull(),
    activityDescription: text('descripcion_actividades').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [
    check('fecha_termino_gte_fecha_inicio', sql`${table.endDate} >= ${table.startDate}`),
  ]
)