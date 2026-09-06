# Sistema de Gestión de Prácticas Profesionales

Aplicación web para administrar las **prácticas profesionales** de los estudiantes de un colegio técnico: registro de prácticas, asociación con empresa, jefe directo y profesor supervisor, y control de acceso por rol (estudiante/profesor) mediante RBAC.

El alcance, el modelo de datos, las reglas de negocio y el plan de etapas están especificados en [`BRIEF.md`](./BRIEF.md).

## Estado del proyecto

| Etapa | Descripción | Estado |
|---|---|---|
| 1 | Scaffold: Hono + TypeScript + Handlebars + Drizzle/SQLite + Bootstrap local | ✔ Ejecutada |
| 2–8 | Esquema y seed, registro/login (JWT + Argon2id), RBAC, CRUD de prácticas, pulido UI | Pendiente |

El servidor arranca y sirve la vista base (`GET /`) y un healthcheck (`GET /health`). Aún no existen tablas, autenticación ni CRUD.

## Stack tecnológico

| Pieza | Tecnología |
|---|---|
| Framework web | [Hono](https://hono.dev) 4 + `@hono/node-server` |
| Motor de plantillas | Handlebars (SSR) |
| ORM | Drizzle ORM (`drizzle-orm/better-sqlite3`) |
| Base de datos | SQLite (`better-sqlite3`), modo WAL |
| UI | Bootstrap 5, distribuido localmente (sin CDN) |
| Validación | Zod (se integra en la etapa 3) |
| Autenticación (planificada) | JWT en cookie httpOnly + Argon2id |
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

### Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run typecheck` | Verificación de tipos (`tsc --noEmit`) |
| `npm run build` | Compilación TypeScript a `dist/` |
| `npm run start` | Ejecutar el build compilado (`node dist/index.js`) |

### Healthcheck

`GET /health` responde `{"status":"ok","db":"connected"}` con la base accesible (503 si la conexión falla).

## Estructura del proyecto

```
├── src/
│   ├── index.ts              # App Hono, estáticos, rutas / y /health, arranque
│   ├── config.ts             # Config desde entorno; rutas absolutas de views/public
│   ├── types.ts              # AppEnv (tipado de Variables de Hono)
│   ├── middleware/
│   │   └── renderer.ts       # Middleware que expone c.var.render() para las vistas
│   ├── lib/
│   │   ├── template-engine.ts# Compilación y caché de plantillas Handlebars
│   │   └── vendor.ts         # Copia Bootstrap de node_modules → public/vendor
│   └── db/
│       └── index.ts          # Cliente better-sqlite3 + Drizzle (WAL, foreign_keys ON)
├── views/
│   ├── home.hbs              # Vista de inicio
│   └── layouts/main.hbs      # Layout base (lang="es-CL", navbar, footer)
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