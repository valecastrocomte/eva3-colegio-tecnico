import { loadConfig } from '../config.js'
import { companies, directSupervisors, practices, users } from './schema.js'
import { createDb } from './index.js'
import { migrate } from './migrate.js'
import type { DbClient } from './index.js'
import { hashPassword } from '../lib/password.js'

/** Development-only password used for every seeded account. */
const SEED_PASSWORD = 'clave1234'

const students = [
  { rut: '11.111.111-1', fullName: 'Valentina Rojas Muñoz', career: 'Técnico en Electrónica' },
  { rut: '22.222.222-2', fullName: 'Matías Soto Cifuentes', career: 'Técnico en Programación' },
]

const teachers = [
  { rut: '33.333.333-3', fullName: 'Prof. Carolina Fuentes Pérez', specialty: 'Electrónica' },
  { rut: '44.444.444-4', fullName: 'Prof. Jorge Araya Campos', specialty: 'Programación' },
]

async function seed(db: DbClient): Promise<void> {
  const passwordHash = await hashPassword(SEED_PASSWORD)
  db.transaction((tx) => {
    tx.delete(practices).run()
    tx.delete(directSupervisors).run()
    tx.delete(companies).run()
    tx.delete(users).run()

    tx.insert(companies)
      .values({
        name: 'TecnoServicios Ltda.',
        address: 'Av. Providencia 1234, Santiago',
        phone: '+56 2 2345 6789',
      })
      .run()

    tx.insert(directSupervisors)
      .values({
        name: 'Rodrigo Gutiérrez Vidal',
        contact: '+56 9 8765 4321',
        position: 'Jefe de Operaciones',
      })
      .run()

    tx.insert(users)
      .values([
        ...students.map((student) => ({
          ...student,
          passwordHash,
          role: 'estudiante' as const,
          specialty: null,
        })),
        ...teachers.map((teacher) => ({
          ...teacher,
          passwordHash,
          role: 'profesor' as const,
          career: null,
        })),
      ])
      .run()
  })
}

const config = loadConfig()
const db = createDb(config.databasePath)
migrate(db)
await seed(db)

console.log(
  `[seed] inserted 2 students, 2 teachers, 1 company and 1 direct supervisor at ${config.databasePath}`
)
console.log(`[seed] login password for all seeded users: ${SEED_PASSWORD}`)