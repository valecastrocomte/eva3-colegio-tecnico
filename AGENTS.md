# AGENTS.md

Guía operativa para agentes de IA y colaboradores que trabajan en **eva3-colegio-tecnico**: Sistema de Gestión de Prácticas Profesionales.

> Documento de referencia obligatorio de producto y arquitectura: [`BRIEF.md`](./BRIEF.md). Léelo antes de planificar cualquier cambio.

---

## 1. Qué es este proyecto

Aplicación web (SSR) para administrar las prácticas profesionales de estudiantes de un colegio técnico:

- Estudiantes registran y consultan **solo sus propias prácticas**.
- Profesores supervisan **todas las prácticas** con control total (CRUD).
- Acceso controlado por **RBAC** (rol + propiedad del registro).

**Estado actual:** las 8 etapas de `BRIEF.md` §16 están completadas (scaffold, esquema, auth, RBAC, CRUD y pulido de UI). El proyecto está cerrado según el alcance v1 de `BRIEF.md` §3; cualquier cambio posterior debe evaluarse contra ese alcance y las convenciones de este documento.

## 2. Stack y comandos

| Pieza | Tecnología |
|---|---|
| Framework | Hono 4 + `@hono/node-server` |
| Plantillas | Handlebars (SSR) |
| DB | SQLite (`better-sqlite3`) + Drizzle ORM |
| UI | Bootstrap 5 (vendored local, sin CDN) |
| Validación | Zod (por instalar en etapa 3) |
| Auth (planificado) | JWT en cookie httpOnly + Argon2id |
| Runtime | Node ≥ 20 (engines), `type: module`, TypeScript estricto |

```bash
npm install          # instalar dependencias
npm run dev          # servidor con recarga (tsx watch, lee .env si existe)
npm run typecheck    # tsc --noEmit — SIEMPRE debe pasar antes de terminar
npm run build        # tsc → dist/
npm run start        # node dist/index.js (requiere build previo)
npm run db:generate  # drizzle-kit generate: migraciones desde src/db/schema.ts → drizzle/
npm run db:migrate   # drizzle-kit migrate: aplica migraciones pendientes a la base
npm run db:seed      # tsx src/db/seed.ts: carga datos mínimos de desarrollo
```

Verificación rápida de que la app vive:

```bash
curl http://localhost:3000/health   # {"status":"ok","db":"connected"}
curl http://localhost:3000/         # vista home renderizada
```

## 3. Estructura del código

```
src/
  index.ts              # Creación de la app Hono, estáticos, rutas / y /health, arranque del server
  config.ts             # loadConfig (PORT, DATABASE_PATH), raíces projectRoot/viewsDir/publicDir
  types.ts              # AppEnv: tipado de Variables de Hono (c.var.render)
  middleware/
    renderer.ts         # Expone c.var.render(view, data) → c.html(renderPage(...))
  lib/
    template-engine.ts  # Compila y cachea .hbs; renderPage() envuelve la vista en layouts/main
    vendor.ts           # ensureBootstrapAssets(): copia node_modules/bootstrap/dist → public/vendor
  db/
    index.ts            # createDb(): abre SQLite, pragmas WAL + foreign_keys=ON, devuelve drizzle
    schema.ts           # Tablas Drizzle: usuarios, empresas, jefes_directos, practicas (FKs y CHECK de fechas)
    migrate.ts          # migrate(db): aplica las migraciones de drizzle/ (se ejecuta al arrancar)
    seed.ts             # Seed de desarrollo: 2 estudiantes, 2 profesores, 1 empresa, 1 jefe directo (npm run db:seed)
drizzle/                # Migraciones SQL generadas con drizzle-kit (commiteadas)
views/
  home.hbs              # Vista única actual
  layouts/main.hbs      # Layout base: lang="es-CL", navbar, footer, {{{body}}}
data/app.db             # Base de datos de desarrollo (gitignored)
public/vendor/          # Bootstrap copiado en runtime (gitignored)
```

## 4. Cómo funciona el runtime (gotchas)

- **`ensureBootstrapAssets()`** se ejecuta al arrancar: si `public/vendor/bootstrap` no existe, copia el `dist` de Bootstrap desde `node_modules`. No subas esos assets a git (`.gitignore` los excluye); se regeneran solos.
- **Vistas:** cada vista `.hbs` se renderiza dentro de `views/layouts/main.hbs` — los datos de la vista llegan con `body` ya renderizado. El layout tiene `lang="es-CL"` y consume Bootstrap desde `/assets/vendor/bootstrap/...` (mapeado a `public/` por `serveStatic`).
- **DB:** `createDb()` abre `DATABASE_PATH` (default `./data/app.db`), crea el directorio si falta, fuerza `journal_mode = WAL` y `foreign_keys = ON`. Al arrancar se aplican las migraciones de `drizzle/` vía `migrate()` (idempotente; registra en `__drizzle_migrations`). `npm run db:seed` recarga los datos mínimos de desarrollo; `health` valida la conexión con `select 1`. En inserts de Drizzle, encadenar `.run()`/`.all()` para ejecutar — `.values()` solo construye la query.
- **Config:** `PORT` y `DATABASE_PATH` vienen de `.env` (opcional; hay defaults). Las rutas de proyecto se resuelven desde `import.meta.url` para que dev (`src/`) y build (`dist/`) apunten al mismo `views/` y `public/`.
- **`db` en `index.ts` es una constante de módulo** declarada después de `createApp` pero usada por el handler de `/health` vía closure: funciona porque el handler corre después de la inicialización. Al refactorizar, mantén la inicialización antes de servir.

## 5. Convenciones obligatorias (verificables en review)

Tomadas de `BRIEF.md` §4 — aplicar a todo cambio:

1. **Código en inglés:** identificadores, funciones, archivos, tablas/columnas, constantes, mensajes internos. **Cero texto en español en el código fuente.**
2. **UI en español (es-CL):** etiquetas, botones, títulos, errores de validación, fechas en `dd/mm/aaaa`. El inglés vive solo en el código, nunca en pantalla.
3. **TypeScript funcional, sin clases:** funciones puras pequeñas de una sola responsabilidad, composición, datos inmutables, sin estado mutable compartido ni efectos secundarios ocultos.
4. **SOLID + capas:** rutas → servicios → repositorios → DB → vistas. Nombres descriptivos, DRY (cero duplicación), sin código muerto ni `TODO` pendientes, dependencias explícitas con inyección donde aporte.
5. **UI con Bootstrap 5** y la dirección de diseño mediante el skill `frontend-design`.
6. **Antes de integrar una librería:** leer la documentación oficial vigente (vía `context7`); no asumir APIs ni versiones de memoria y confirmar que la versión existente en `package.json` no se rompe.
7. **Validación en servidor con Zod** (a partir de la etapa 3); nunca fiarse solo del cliente.

## 6. Commits: Conventional Commits + versión SemVer

### Formato obligatorio (Conventional Commits)

Todo commit usa el formato `<tipo>(<scope opcional>): <descripción>`:

- Descripción en **imperativo y en español**, minúscula inicial, sin punto final, ≤ 72 caracteres.
- Scope opcional para acotar el área: `feat(health): …`, `docs(brief): …`.
- Cuerpo solo si aporta contexto (el *por qué*, no el *qué*); bullets como en el commit de `/health`.
- Cambio de compatibilidad: footer `BREAKING CHANGE: …` o `!` tras el tipo (`feat!: …`).

Tipos permitidos:

| Tipo | Uso | Bump en `package.json` |
|---|---|---|
| `feat` | Nueva funcionalidad visible | MINOR |
| `fix` | Corrección de bug | PATCH |
| `refactor` | Reescribir sin cambiar comportamiento | PATCH |
| `perf` | Optimización | PATCH |
| `chore` | Mantenimiento, dependencias | PATCH |
| `build` | Scripts/build/herramientas | PATCH |
| `ci` | Configuración de CI | PATCH |
| `docs` | Solo documentación (BRIEF/README/AGENTS) | sin bump |
| `test` | Solo tests | sin bump |
| `style` | Solo formato, sin cambio funcional | sin bump |

### Regla de versión (obligatoria)

Todo commit que modifique **código** (`src/`, `views/`) o **configuración** (`package.json`, `tsconfig.json`, `.env.example`, dependencias y cualquier config futura) **debe subir la versión de `package.json` en el mismo commit**, según el tipo:

- `feat` → MINOR: `0.1.0` → `0.2.0`
- `fix` / `refactor` / `perf` / `chore` / `build` / `ci` → PATCH: `0.1.0` → `0.1.1`
- `feat!` o `BREAKING CHANGE` → MAJOR (mientras la versión sea `0.x`, equivale a MINOR: `0.1.0` → `0.2.0`)
- Commits solo de documentación o tests → **no suben versión**.

El bump viaja **dentro del mismo commit** que el cambio, para que `package.json` siempre refleje el código que acompaña.

## 7. Modelo RBAC objetivo

| Rol | Permisos sobre prácticas |
|---|---|
| `estudiante` | Crear · Leer solo las suyas (`estudiante_id == id`) |
| `profesor` | Crear · Leer todas · Actualizar · Eliminar |

Reglas de negocio clave para el CRUD (etapas 5–7):

- El estudiante queda asignado automáticamente como `estudiante_id` (no elige otro estudiante).
- `profesor_supervisor_id` se elige entre usuarios rol `profesor`.
- Servidor siempre protege aunque la UI oculte botones (403 si se fuerza la ruta).
- Middlewares planificados: `authRequired`, `requireRol('profesor')`, `ownerOrProfesor`.
- Entidades: `usuarios`, `empresas`, `jefes_directos`, `practicas` (ver ER en `BRIEF.md` §6).

## 8. Qué NO hacer

- No agregar archivos/módulos fuera del alcance de la etapa en curso (ver `BRIEF.md` §3 y §16).
- No escribir clases, estado mutable global, SQL concatenado ni credenciales en el código.
- No romper la caché de plantillas ni el vendoring de Bootstrap; no introducir CDN.
- No subir `.env`, `data/`, `dist/`, `node_modules/` ni `public/vendor/` (gitignored).
- No dejar `TODO`, código comentado ni duplicación.
- Terminar solo con `npm run typecheck` en verde y, si aplica, la app levantada probada en el flujo afectado.

## 9. Flujo de trabajo recomendado

1. Ver el estado de etapas en `BRIEF.md` §16 y no saltarse orden.
2. Leer `src/` completo antes de tocar; reutilizar `renderer`, `template-engine`, `config` y `createDb` existentes.
3. Implementar en inglés, UI en español, capas separadas.
4. Verificar: `npm run typecheck` + `npm run dev` + ejercitar la ruta/vista afectada (curl o navegador).
5. Actualizar `BRIEF.md` (tabla de etapas) y estos documentos solo cuando el cambio cierre una etapa.
6. Commitear con mensaje Conventional Commit; si el commit toca código o configuración, subir la versión en `package.json` en el mismo commit según la tabla de la sección 6.