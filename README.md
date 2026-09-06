# Sistema de Gestión de Prácticas Profesionales

Aplicación web para administrar las **prácticas profesionales** de los estudiantes de un colegio técnico: registro de prácticas, asociación con empresa, jefe directo y profesor supervisor, y control de acceso por rol (estudiante/profesor) mediante RBAC.

El alcance, el modelo de datos, las reglas de negocio y el plan de etapas están especificados en [`BRIEF.md`](./BRIEF.md).

## Estado del proyecto

| Etapa | Descripción | Estado |
|---|---|---|
| 1 | Scaffold: Hono + TypeScript + Handlebars + Drizzle/SQLite + Bootstrap local | ✔ Ejecutada |
| 2 | Esquema Drizzle + migraciones + seed de datos base | ✔ Ejecutada |
| 3 | Registro de usuarios (validación Zod + Argon2id) | ✔ Ejecutada |
| 4 | Login/logout y sesión JWT (cookie httpOnly + `authRequired`) | ✔ Ejecutada |
| 5 | RBAC y ownership (`requireRol`, `ownerOrProfesor`) | ✔ Ejecutada |
| 6 | CRUD de prácticas: crear y listar | ✔ Ejecutada |
| 7 | CRUD de prácticas: detalle, editar y eliminar | ✔ Ejecutada |
| 8 | Pulido de UI y cierre | ✔ Ejecutada |

El servidor sirve la vista base (`GET /`), un healthcheck (`GET /health`), el registro y el login/logout de usuarios (`/auth/registro`, `/auth/login`, `/auth/logout`), y el CRUD completo de prácticas (`/practicas`, `/practicas/nueva`, `/practicas/:id`, editar y eliminar) con RBAC. La interfaz está pulida y la navegación se adapta por rol (etapa 8).

## Stack tecnológico

| Pieza | Tecnología |
|---|---|
| Framework web | [Hono](https://hono.dev) 4 + `@hono/node-server` |
| Motor de plantillas | Handlebars (SSR) |
| ORM | Drizzle ORM (`drizzle-orm/better-sqlite3`) |
| Base de datos | SQLite (`better-sqlite3`), modo WAL |
| UI | Bootstrap 5, distribuido localmente (sin CDN) |
| Validación | Zod (schemas de entrada) |
| Autenticación | Argon2id (integrados) · JWT en cookie httpOnly (etapa 4) |
| Runtime | Node.js ≥ 20, TypeScript estricto, módulos ESM |

## Requisitos

- Node.js ≥ 20 (probado con Node 24)
- npm

## Puesta en marcha

```bash
git clone <url-del-repositorio>
cd eva3-colegio-tecnico
npm install
cp .env.example .env   # opcional: los valores por defecto funcionan sin .env
npm run dev
```

Abrir <http://localhost:3000>. El servidor recarga automáticamente ante cambios (`tsx watch`).

Variables de entorno (`.env`):

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto del servidor HTTP |
| `DATABASE_PATH` | `./data/app.db` | Ruta del archivo SQLite (relativa a la raíz del proyecto) |
| `JWT_SECRET` | — | Secreto para firmar los JWT de sesión (obligatorio en producción) |
| `JWT_EXPIRES_SECONDS` | `604800` | Duración de la sesión en segundos (7 días) |

### Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run typecheck` | Verificación de tipos (`tsc --noEmit`) |
| `npm run build` | Compilación TypeScript a `dist/` |
| `npm run start` | Ejecutar el build compilado (`node dist/index.js`) |
| `npm run db:seed` | Regenera los datos base (usuarios demo, empresa y jefe directo) |

Los usuarios demo creados por `npm run db:seed` usan la contraseña `clave1234` y su `password_hash` se genera con Argon2id.

### Healthcheck

`GET /health` responde `{"status":"ok","db":"connected"}` con la base accesible (503 si la conexión falla).

## Estructura del proyecto

```
├── src/
│   ├── index.ts              # App Hono, estáticos, rutas / y /health, arranque
│   ├── config.ts             # Config desde entorno (puerto, DB, JWT); rutas absolutas
│   ├── types.ts              # AppEnv (tipado de Variables de Hono)
│   ├── middleware/
│   │   ├── auth.ts           # attachUser (sesión JWT) y authRequired
│   │   └── renderer.ts       # Middleware que expone c.var.render() para las vistas
│   ├── lib/
│   │   ├── template-engine.ts# Compilación y caché de plantillas Handlebars
│   │   ├── vendor.ts         # Copia Bootstrap de node_modules → public/vendor
│   │   ├── rut.ts            # Validación y normalización de RUT (dígito verificador)
│   │   ├── password.ts       # Hash y verificación Argon2id
│   │   └── session.ts        # Firma y verificación de JWT de sesión
│   ├── schemas/
│   │   └── auth.ts           # Schemas Zod de registro y login
│   ├── services/
│   │   └── users.ts          # Consultas de usuarios (findByRut, insert)
│   ├── routes/
│   │   └── auth.ts           # Rutas /auth/registro, /auth/login, /auth/logout
│   └── db/
│       └── index.ts          # Cliente better-sqlite3 + Drizzle (WAL, foreign_keys ON)
├── views/
│   ├── home.hbs              # Vista de inicio
│   ├── auth/                 # Vistas de registro y login
│   └── layouts/main.hbs      # Layout base (lang="es-CL", navbar con sesión, footer)
├── public/vendor/            # Assets de Bootstrap (generados en runtime, gitignored)
├── data/                     # Base SQLite de desarrollo (gitignored)
├── BRIEF.md                  # Especificación completa del sistema
├── AGENTS.md                 # Guía de convenciones para agentes/colaboradores
└── package.json
```

## Arquitectura

```
HTML + Bootstrap (Handlebars SSR)
        │
        ▼
Hono app ── middleware (auth, rbac, ownership) ── rutas ── validación Zod
        │
        ▼
Drizzle ORM ── SQLite (WAL)
```

- **Vistas SSR:** cada template se renderiza dentro de `views/layouts/main.hbs`; la vista recibe `body` ya renderizado.
- **Estáticos:** `/assets/*` se sirve desde `public/`; al arrancar, `ensureBootstrapAssets()` copia Bootstrap desde `node_modules` si `public/vendor/bootstrap` no existe (sin CDN, funcional offline).
- **Base de datos:** se crea automáticamente en `data/` con `journal_mode = WAL` y `foreign_keys = ON`.

## Modelo de permisos (target)

| Acción | Estudiante | Profesor |
|---|---|---|
| Crear práctica | ✔ | ✔ |
| Leer sus propias prácticas | ✔ | ✔ |
| Leer cualquier práctica | ✘ | ✔ |
| Actualizar práctica | ✘ | ✔ |
| Eliminar práctica | ✘ | ✔ |

Detalle de entidades (`usuarios`, `empresas`, `jefes_directos`, `practicas`), rutas, reglas de validación y criterios de aceptación: [`BRIEF.md`](./BRIEF.md).

## Convenciones de desarrollo

- **Código en inglés**, **interfaz en español (es-CL)** con fechas `dd/mm/aaaa`.
- **TypeScript funcional** sin clases: funciones puras y pequeñas, composición, datos inmutables.
- **Capas:** rutas → servicios → repositorios → DB → vistas; cero duplicación y cero `TODO`.
- **Validación de entrada siempre en servidor** (Zod).
- Ver más en [`AGENTS.md`](./AGENTS.md) — reglas verificables en revisión de código.