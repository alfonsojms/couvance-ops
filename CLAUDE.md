# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Couvance Ops es una herramienta interna (2 socios de la agencia Couvance) para clientes, proyectos, presupuestos/hitos y cobranza por WhatsApp. La especificación completa (modelo de datos campo a campo, catálogo de endpoints, reglas de negocio) vive en `agents.md`, derivado de `couvance-ops-tech-spec.md` y `couvance-ops-functional-spec.md`. Las guías de diseño visual y producto están en `DESIGN.md` y `PRODUCT.md`. La documentación y los comentarios del proyecto están en español.

## Comandos

```bash
npm run dev:server          # Backend Hono en Node (tsx watch), puerto 3000, SQLite en ./data/couvance-ops.db
npm run dev                 # Frontend Vite en :5173, proxy de /api -> 127.0.0.1:3000
# INICIAR.bat / dev.ps1 levantan ambos a la vez en Windows

npm test                                        # Vitest (solo test/**/*.test.ts(x))
npx vitest run test/budgets.test.ts             # un archivo
npx vitest run test/budgets.test.ts -t "texto"  # un caso por nombre
npm run test:e2e                                # Playwright (e2e/), arranca node-entry en :3101 con BD temporal
npx playwright test e2e/unlock.spec.ts          # un spec e2e
npx tsc --noEmit                                # typecheck de src/ y functions/ (no incluye test/)
npm run lint                                    # ESLint: errores rompen el CI; los warnings (any, setState en useEffect) son deuda conocida
npm run format:check                            # Prettier solo sobre código (.ts/.tsx/.js/.css); `npm run format` lo aplica
npm run test:coverage                           # Vitest + cobertura v8 (reporte en coverage/, sin umbral mínimo)
npx wrangler pages functions build --outdir <tmp> --compatibility-flags nodejs_compat --compatibility-date 2024-09-23
                                                # bundle Edge de producción (npm run build no lo cubre)

npm run build               # build:client (Vite -> dist/client) + build:server (tsup -> dist/server)
npm run db:generate         # drizzle-kit generate tras cambiar src/server/db/schema.ts
npm run db:migrate:local    # aplica migraciones a D1 local (wrangler)
docker compose up -d --build
```

PIN sembrado por defecto: `12345678` (sobrescribible con `INITIAL_PIN`, `SECURITY_Q1/A1/Q2/A2`; secreto con `PIN_SECRET`, ver `.env.example`).

## Arquitectura

**Una sola app Hono, dos runtimes.** `src/server/app.ts` define todo el API y se monta en:
- Cloudflare Pages: `functions/api/[[route]].ts` (`hono/cloudflare-pages`), BD = binding `DB` de D1.
- Node/Docker: `src/server/node-entry.ts` abre `better-sqlite3` (WAL + `foreign_keys = ON`), **aplica las migraciones de `./drizzle` y siembra `auth_config` al arrancar**, sirve `dist/client` como SPA estática y registra la BD con `setGlobalDb()`.

Los handlers siempre obtienen la BD con `getDb(c)` (`src/server/db/index.ts`), que resuelve en orden: `c.env.DB` (D1) → `c.get('db')` → instancia global de Node. Nunca importes un driver concreto dentro de un módulo.

**Operaciones atómicas**: toda escritura multi-tabla usa `runAtomic(db, [stmt1, stmt2, ...])` (`src/server/db/atomic.ts`), pasando las sentencias Drizzle **sin `await`**. En D1 corre como `db.batch`, en better-sqlite3 como `db.transaction` síncrona; ambos caminos (incluido el rollback) están testeados en `test/server-infra.test.ts`.

**Errores y validación HTTP** (`src/server/shared/http.ts`): `requireId(c.req.param('id'), mensaje)` y `parseBody(c, schema, fallback?)` lanzan `HttpError(400, mensaje)`; para 404/409 lanzá `new HttpError(status, mensaje)`. `app.onError` lo convierte en `{ error: mensaje }` con su status, que es el contrato de errores de la SPA. Los mensajes de error son parte del contrato: no los cambies sin actualizar los snapshots a propósito.

**Cadena de middlewares** (en `app.ts`): inyección de BD → `sanitizeMiddleware` (solo rechaza bytes nulos en URL/query con 400; **no toca el body**: los textos se limpian con `.transform(sanitizeString)` dentro de cada esquema Zod y los IDs de ruta con `requireId`) → `pinAuthMiddleware` en `/api/*`, que exime `POST /api/auth/unlock`, `GET /api/auth/questions`, `POST /api/auth/recover`, `POST /api/auth/reset-pin` y `GET /api/health`. Cookie `couvance_session` (HttpOnly, `SameSite=Lax` obligatorio para abrir links desde WhatsApp, 30 días), firmada con `PIN_SECRET`. Rate limit en memoria de 5 fallos / 15 min por IP en `/api/auth/*`. **No hay middleware CORS a propósito**: SPA y API comparten origen en todos los entornos (ver `test/cors.test.ts`); no lo reintroduzcas.

**Módulos** en `src/server/modules/<dominio>/`, cada uno un sub-app Hono montado en `app.ts` (`budgets` se monta en `/api` porque expone rutas `/projects/:id/budgets`, `/budgets/:id/*` y `/milestones/:id/pay`). El esquema Drizzle (`src/server/db/schema.ts`) usa propiedades camelCase mapeadas a columnas snake_case.

**Capas por módulo** (todos los módulos del backend; ver `odd/tasks/layered-architecture-refactor.md`). Las dependencias van en un solo sentido:
- `domain.ts`: reglas puras (cálculos, transiciones de estado). Sin Hono, Drizzle, reloj ni IDs.
- `schemas.ts`: esquemas Zod de entrada.
- `repository.ts`: `createXRepository(db)` con queries Drizzle; escrituras de varias filas o tablas vía `runAtomic`. Sobre la unión `D1Db | SqliteDb` siempre `await` a `.all()`, y `select()` sin argumentos; para proyecciones o joins (`select({...})`) usá `asQueryDb(db)` de `db/index.ts`, nunca `as SqliteDb`. Los totales de hitos (cobrado/pendiente) se calculan solo con `sumMilestones` (`modules/projects/domain.ts`).
- `service.ts`: `createXService(repo, clock?)` con los casos de uso (`ServiceClock` de `shared/clock.ts`). No conoce HTTP: lanza `DomainError` (`invalid`/`unauthorized`/`notFound`/`conflict`/`internal` de `shared/errors.ts`, que `app.onError` traduce a 400/401/404/409/500, siempre como `{ error }` sin stack). Los tokens se emiten solo con `issueToken` y se leen con `getRequestToken` (`middlewares/auth.ts`).
- `routes.ts`: solo HTTP (`requireId`, `parseBody`, armar la respuesta).
- `index.ts`: exporta las rutas como default y lo que otros módulos o tests necesiten.

**Frontend**: SPA React en `src/client/src` (alias `@` → `src/client/src`, `@server` → `src/server`). La capa HTTP tiene tres piezas: `lib/api.ts` es el núcleo (`request`, `ApiError` y el handler de 401); `lib/resources/*` define un cliente por recurso (`clientsApi`, `projectsApi`, `budgetsApi`/`milestonesApi`, `financeApi`, `authApi`, `showcaseApi`, `backupApi`), y los componentes nunca llaman `api.*` directo; `lib/types.ts` reúne los tipos de respuesta compartidos. Los recursos usan el objeto `api` en cada llamada (no lo desestructuran), así los tests de UI pueden mockear `lib/api` con solo `{ api }`; `test/api-resources.test.ts` fija método, URL y cuerpo de cada función. Helpers de `wa.me`/portapapeles en `lib/utils.ts`, primitivas UI propias en `components/ui`. Cada página es un contenedor fino (`pages/*.tsx`, export con nombre porque `App.tsx` las carga con `lazy`) que conecta un hook de datos y acciones (`hooks/use<Página>*.ts`, el único lugar que llama a `lib/resources`) con componentes presentacionales en `components/<área>/` que reciben todo por props; la lógica pura de cada área vive en módulos `.ts` junto a sus componentes y se testea sin React. `index.html` y `vite.config.ts` están en la raíz.

**Tests**: los de integración (`test/integration.test.ts`, `test/budgets.test.ts`) crean SQLite `:memory:`, migran `./drizzle`, hacen `setGlobalDb()` + `seedInitialAuthIfNeeded()` y llaman a `app.request(...)` directamente, sin servidor. `test/api-contract.test.ts` fija con snapshots el contrato HTTP completo (status + cuerpo) sobre un escenario de negocio, con reloj fijo y UUIDs normalizados (`test/helpers/contract.ts`): si un refactor cambia una respuesta, el snapshot falla. Solo regenerá snapshots (`-u`) cuando el cambio de contrato sea intencional. Los `*.ui.test.tsx` usan Testing Library. Los e2e levantan su propio servidor en `:3101` con una SQLite temporal nueva por corrida (no tocan `./data`).

## Reglas de negocio (invariantes)

- **RN-01** Montos de presupuestos e hitos son **enteros**. Hito = `Math.round(total * pct / 100)` y **el último hito absorbe el residuo** para que la suma sea exactamente `total_amount`. Solo `projects.recurring_amount` admite decimales.
- **RN-02** Los porcentajes de los hitos deben sumar exactamente 100, si no → `400`.
- **RN-03** `POST /api/budgets/:id/approve` es atómico: presupuesto `APPROVED`, proyecto `IN_PROGRESS`, hitos `DRAFT` → `PENDING`. Presupuestos solo editables en `DRAFT`. Crear y editar un presupuesto (con sus hitos) también son atómicos.
- **RN-04** `POST /api/budgets/:id/pay-all`: todos los hitos `PENDING` → `PAID` con `paid_at`.
- **Transiciones de estado**: aprobar o rechazar solo desde `DRAFT` o `SENT`; si no, 409. Cobrar un hito solo si está `PENDING` (`DRAFT` o `CANCELLED` → 409). Cobrar un hito ya `PAID` responde 200 sin tocar el `paid_at` original, para que un doble toque sea inofensivo. Las reglas están en `modules/budgets/domain.ts` y los tests en `test/budgets-transitions.test.ts`.
- **RN-05** Cancelar un proyecto cancela hitos `PENDING` pero **nunca toca los `PAID`**; el proyecto no se borra. Proyecto e hitos se actualizan en una sola unidad atómica (`test/projects-cancel.test.ts`). `PATCH /api/projects/:id` rechaza `clientId`/`status` (400) y devuelve 409 si está `CANCELLED`.
- **RN-06** `DELETE /api/clients/:id` → `409` si el cliente tiene cualquier proyecto.
- **RN-07** Showcase: solo `COMPLETED` + `production_status = 'ACTIVE'` + `production_url` no vacío.
- **RN-08** Radar: hitos `PENDING` por `due_date ASC` + recurrentes que vencen en < 30 días; `POST /api/projects/:id/renew` suma 1 mes o 1 año.
- **RN-09** WhatsApp: con teléfono abre `wa.me`; sin teléfono copia el mensaje al portapapeles y avisa con toast de Sonner.
- **RN-10** `GET /api/backup/export` **nunca** incluye `auth_config` ni hashes.

## Restricciones del stack

- Hash solo con SHA-256 nativo (Web Crypto / Node crypto): `sha256(input.trim().toLowerCase() + PIN_SECRET)`. **Prohibido `bcrypt`/`argon2`** u otra dependencia nativa C++ — rompe Cloudflare Edge.
- Validación de entrada con Zod en todos los endpoints.
- UI: Radix primitives + Tailwind, paleta neutra de alto contraste, bordes de 1px, sin degradados ni sombras exageradas. **Prohibido Framer Motion**; solo transiciones CSS (`transition-all duration-150 ease-out`). Iconos `lucide-react`, toasts `sonner`. El Radar debe usarse con una mano en móvil.
