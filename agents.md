# 🤖 AGENTS.md — Guía de Desarrollo e Instrucciones para Agentes de IA

> **Propósito del Archivo:** Este documento sirve como la guía definitiva de contexto, arquitectura, reglas de negocio y directrices de implementación para agentes de IA y desarrolladores que operen sobre el repositorio de **Couvance Ops**. Está derivado directamente de la especificación técnica (`couvance-ops-tech-spec.md`) y funcional (`couvance-ops-functional-spec.md`).

---

## 🧭 1. Resumen Ejecutivo del Proyecto

* **Nombre:** Couvance Ops
* **Naturaleza:** Herramienta interna para los 2 socios/operadores de la agencia digital Couvance.
* **Arquitectura:** Monolito modular fullstack en TypeScript con ejecución dual:
  1. **Edge Serverless (Producción $0):** Cloudflare Pages + Cloudflare Pages Functions + Cloudflare D1 (SQLite serverless).
  2. **Contenedor Autónomo (Local / Docker / VPS):** Node.js (@hono/node-server) + SQLite embebido local (`better-sqlite3` con modo WAL) en volumen persistente `/app/data/couvance-ops.db`.
* **Filosofía de Producto:** Cero burocracia administrativa, agilidad operativa máxima, acceso mediante PIN de 8 dígitos recordado en dispositivo, cobro express vía WhatsApp con fallback al portapapeles, y diseño de autor ultraligero anti-"AI slop".

---

## 🛠️ 2. Stack Tecnológico y Dependencias Obligatorias

| Capa / Función | Tecnología | Reglas de Implementación |
| :--- | :--- | :--- |
| **Backend Framework** | **Hono** (TypeScript) | Sintaxis ligera, modular por dominios (`src/server/modules/*`), middlewares nativos. |
| **Edge Adapter** | **`hono/cloudflare-pages`** | Entrypoint en `functions/api/[[route]].ts` que monta la app de Hono en Cloudflare Pages. |
| **Node Adapter** | **`@hono/node-server`** | Servidor para Docker y desarrollo local en `src/server/node-entry.ts`. |
| **Frontend Framework** | **React (Vite) + TypeScript** | SPA sin recargas de página; ubicado en `src/client/`. |
| **Componentes UI** | **Radix UI Primitives (Headless)** | Modales (`Dialog`), menús (`DropdownMenu`), pestañas (`Tabs`), tooltips sin estilos prefabricados. |
| **Estilos CSS** | **Tailwind CSS** | Utilidades directas, bordes de 1px (`border-neutral-800`), paleta neutra de alto contraste. |
| **Animaciones** | **CSS Nativo / Tailwind Transitions** | **PROHIBIDO usar Framer Motion** ni librerías pesadas. Solo `transition-all duration-150 ease-out`. |
| **Notificaciones** | **Sonner** | Toasts minimalistas para confirmaciones de cobro y avisos de portapapeles. |
| **Iconos** | **Lucide React** | Importaciones puntuales por componente. |
| **Base de Datos** | **SQLite** (Cloudflare D1 en Edge / `better-sqlite3` en Node) | Driver unificado y tipado con Drizzle. |
| **ORM & Migraciones** | **Drizzle ORM + Drizzle Kit** | Esquemas relacionales en `src/server/db/schema.ts`, migraciones en `./drizzle`. |
| **Validación** | **Zod** | Esquemas compartidos entre cliente y servidor. |
| **Criptografía / Hash** | **Web Crypto / Node Crypto (SHA-256 nativo)** | **PROHIBIDO usar `bcrypt` o `argon2`** (requieren binarios C++ incompatibles con Cloudflare Edge). |

---

## 🏛️ 3. Estructura de Directorios del Repositorio

```text
couvance-ops/
├── drizzle/                    # Migraciones SQL generadas por Drizzle Kit
│   └── 0000_init.sql
├── functions/                  # Adaptador nativo Cloudflare Pages Functions
│   └── api/
│       └── [[route]].ts        # Entrypoint para Cloudflare Pages
├── src/
│   ├── server/                 # BACKEND (Hono)
│   │   ├── db/
│   │   │   ├── schema.ts       # Esquema de tablas Drizzle
│   │   │   ├── d1.ts           # Conector Cloudflare D1
│   │   │   ├── sqlite.ts       # Conector local better-sqlite3
│   │   │   └── index.ts        # Factoría agnóstica de BD según runtime
│   │   ├── middlewares/
│   │   │   ├── auth.ts         # Validación de PIN y cookie de sesión
│   │   │   └── rate-limit.ts   # Rate limiting (5 intentos fallidos / 15 min en /api/auth/*)
│   │   ├── modules/
│   │   │   ├── auth/           # Login PIN, preguntas secretas, reseteo, logout
│   │   │   ├── clients/        # Gestión de clientes y protección 409
│   │   │   ├── projects/       # Proyectos, showcase y cancelación en cascada
│   │   │   ├── budgets/        # Presupuestos e hitos (cálculo de residuos, aprobación)
│   │   │   ├── finance/        # Radar de cobranzas WhatsApp, recurrentes y métricas
│   │   │   └── backup/         # Exportación estructurada JSON (excluye AUTH_CONFIG)
│   │   ├── app.ts              # Instancia central de Hono y enrutador API
│   │   ├── node-entry.ts       # Entrypoint Node.js/Docker con migraciones y static serving
│   │   └── index.ts            # Entrypoint export para Cloudflare
│   │
│   └── client/                 # FRONTEND (React + Vite SPA)
│       ├── src/
│       │   ├── components/     # Componentes UI (Navbar, Modales, WhatsApp Button, Teclado PIN)
│       │   ├── hooks/          # Custom hooks para API y estado
│       │   ├── pages/
│       │   │   ├── Dashboard.tsx   # Radar de cobros y métricas clave
│       │   │   ├── Projects.tsx    # Gestión de proyectos y cotizaciones
│       │   │   ├── Showcase.tsx    # Catálogo de ventas filtrable
│       │   │   ├── Clients.tsx     # Directorio de clientes
│       │   │   └── Unlock.tsx      # Teclado numérico PIN de 8 dígitos
│       │   ├── lib/
│       │   │   ├── utils.ts        # Enlaces wa.me y copy-to-clipboard
│       │   │   └── api.ts          # Cliente HTTP tipado
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── index.html
│       └── vite.config.ts
│
├── Dockerfile                  # Multi-stage build (node:20-slim)
├── docker-compose.yml          # Compose specification con volumen persistente couvance_data
├── wrangler.toml               # Configuración Cloudflare Pages & D1 binding
├── drizzle.config.ts           # Configuración Drizzle Kit
├── package.json
├── tsconfig.json
└── agents.md                   # Este archivo
```

---

## 🗄️ 4. Modelo de Datos Físico (Drizzle ORM)

### Tablas y Campos

1. **`auth_config`** (Registro único con `id = 1`):
   - `id`: `integer` (Primary Key, siempre `1`)
   - `pin_hash`: `text` (Hash SHA-256 de `PIN + PIN_SECRET`)
   - `q1`: `text` (Pregunta de seguridad 1)
   - `a1_hash`: `text` (Hash SHA-256 de `respuesta1.trim().toLowerCase() + PIN_SECRET`)
   - `q2`: `text` (Pregunta de seguridad 2)
   - `a2_hash`: `text` (Hash SHA-256 de `respuesta2.trim().toLowerCase() + PIN_SECRET`)
   - `updated_at`: `text` (ISO 8601)

2. **`clients`**:
   - `id`: `text` (PK, CUID / UUID)
   - `name`: `text` (**Obligatorio**, nombre o empresa)
   - `contact_name`: `text` (Opcional)
   - `phone`: `text` (Opcional, teléfono o WhatsApp internacional)
   - `email`: `text` (Opcional)
   - `notes`: `text` (Opcional)
   - `created_at`: `text` (ISO 8601)
   - `updated_at`: `text` (ISO 8601)

3. **`projects`**:
   - `id`: `text` (PK, CUID / UUID)
   - `client_id`: `text` (FK -> `clients.id`, cascade o restrict)
   - `title`: `text` (**Obligatorio**, nombre del proyecto)
   - `category`: `text` (`'LANDING'` | `'ECOMMERCE'` | `'CORPORATE'` | `'WEBAPP'`)
   - `status`: `text` (`'PROSPECT'` | `'IN_PROGRESS'` | `'COMPLETED'` | `'CANCELLED'`)
   - `production_url`: `text` (Opcional)
   - `production_status`: `text` (`'ACTIVE'` | `'INACTIVE'`, default `'ACTIVE'`)
   - `code_repo_url`: `text` (Opcional, GitHub / GitLab)
   - `resources_url`: `text` (Opcional, Drive / Dropbox)
   - `has_recurring`: `integer` (`0` = No, `1` = Sí, default `0`)
   - `recurring_amount`: `real` (Monto de hosting/mantenimiento, admite decimales)
   - `recurring_currency`: `text` (Default `'USD'`)
   - `recurring_period`: `text` (`'MONTHLY'` | `'ANNUALLY'`, default `'ANNUALLY'`)
   - `recurring_renewal_date`: `text` (Formato `YYYY-MM-DD`)
   - `created_at`: `text` (ISO 8601)
   - `updated_at`: `text` (ISO 8601)

4. **`budgets`**:
   - `id`: `text` (PK, CUID / UUID)
   - `project_id`: `text` (FK -> `projects.id`)
   - `title`: `text` (**Obligatorio**, concepto del presupuesto)
   - `total_amount`: `integer` (**Monto entero estricto, sin decimales**)
   - `currency`: `text` (Default `'USD'`)
   - `status`: `text` (`'DRAFT'` | `'SENT'` | `'APPROVED'` | `'REJECTED'`, default `'DRAFT'`)
   - `created_at`: `text` (ISO 8601)
   - `updated_at`: `text` (ISO 8601)

5. **`milestones`**:
   - `id`: `text` (PK, CUID / UUID)
   - `budget_id`: `text` (FK -> `budgets.id`)
   - `title`: `text` (Ej: `"50% Anticipo"`, `"50% Entrega"`)
   - `percentage`: `integer` (**Porcentaje entero**, ej: `50`)
   - `amount`: `integer` (**Monto calculado entero**)
   - `due_date`: `text` (Estimada `YYYY-MM-DD`)
   - `status`: `text` (`'DRAFT'` | `'PENDING'` | `'PAID'` | `'CANCELLED'`, default `'DRAFT'`)
   - `paid_at`: `text` (ISO 8601 o fecha de pago efectivo)
   - `created_at`: `text` (ISO 8601)
   - `updated_at`: `text` (ISO 8601)

---

## ⚖️ 5. Reglas de Negocio Críticas e Invariantes

Cualquier agente o desarrollador que modifique la lógica del sistema debe garantizar el cumplimiento estricto de las siguientes reglas:

1. **RN-01 (Sin Decimales en Presupuestos y Conciliación de Residuos):**
   - Los montos de presupuestos e hitos son **enteros**.
   - Al calcular el monto de un hito a partir del porcentaje: `Math.round((totalAmount * percentage) / 100)`.
   - Si la división deja fracciones o residuos, **el último hito absorbe la diferencia** para que `sum(milestones.amount) === budget.total_amount` con exactitud matemática.
   - *Excepción:* Únicamente `projects.recurring_amount` permite decimales (ej. $9.99/mes).

2. **RN-02 (Regla de Oro del 100%):**
   - La suma de los porcentajes de los hitos de un presupuesto debe ser **exactamente 100%**. De lo contrario, Zod y el backend rechazan la petición con `400 Bad Request`.

3. **RN-03 (Aprobación Atómica en 1 Clic):**
   - Al invocar `POST /api/budgets/:id/approve`:
     - Presupuesto pasa a `APPROVED`.
     - Proyecto pasa a `IN_PROGRESS`.
     - Todos los hitos asociados pasan de `DRAFT` a `PENDING`.
     - Se ejecuta de manera atómica (usando `db.batch` en Cloudflare D1 o transacción en SQLite local).

4. **RN-04 (Operación Cobro Express "Cobrar Todo"):**
   - `POST /api/budgets/:id/pay-all` actualiza todos los hitos en estado `PENDING` del presupuesto a `PAID`, registrando `paid_at = new Date().toISOString()`.

5. **RN-05 (Cancelación No Destructiva):**
   - Al cambiar el estado de un proyecto a `CANCELLED`:
     - Todos los hitos en estado `PENDING` se cancelan (`status = 'CANCELLED'`).
     - Los hitos con estado `PAID` se mantienen **intactos** para preservar el histórico de ingresos.
     - El proyecto no se borra de la BD; se marca tachado en la UI.

6. **RN-06 (Integridad Referencial en Eliminación de Clientes):**
   - `DELETE /api/clients/:id` verifica `COUNT(projects) === 0`.
   - Si el cliente tiene proyectos asociados (en cualquier estado), el backend retorna `409 Conflict` con un mensaje explicativo.

7. **RN-07 (Criterio de Elegibilidad para Showcase):**
   - `GET /api/showcase` solo retorna proyectos que cumplan simultáneamente:
     - `status = 'COMPLETED'`
     - `production_status = 'ACTIVE'`
     - `production_url IS NOT NULL AND production_url != ''`

8. **RN-08 (Radar de Finanzas y Alerta Preventiva de Recurrentes a 30 Días):**
   - `GET /api/finance/radar` consolida:
     1. Hitos `PENDING` ordenados por `due_date ASC`, con DTO listo para WhatsApp (`client_name`, `client_phone`, `project_title`, `amount`, `currency`, `due_date`).
     2. Servicios recurrentes (`has_recurring = 1`) cuya `recurring_renewal_date` venza en menos de 30 días.
   - `POST /api/projects/:id/renew` suma un período (+1 mes si `MONTHLY`, +1 año si `ANNUALLY`) tras cobrar la renovación.

9. **RN-09 (Flujo WhatsApp y Fallback de Portapapeles):**
   - En la UI, si el cliente tiene teléfono, el botón abre `https://wa.me/<phone>?text=<mensaje_codificado>`.
   - Si el cliente **no tiene teléfono registrado**, el frontend copia automáticamente el mensaje cordial al portapapeles y despliega un toast con Sonner avisando al usuario.

10. **RN-10 (Seguridad en Exportación de Respaldo):**
    - `GET /api/backup/export` descarga un archivo JSON con `clients`, `projects`, `budgets` y `milestones`.
    - **NUNCA exportar la tabla `auth_config`** ni ninguna credencial o hash en el respaldo descargable.

---

## 🔒 6. Arquitectura de Seguridad y Autenticación

1. **Esquema de Claves y Hashes:**
   - La tabla `auth_config` almacena `pin_hash`, `q1`, `a1_hash`, `q2`, `a2_hash`.
   - Función hash estándar: `sha256(input.trim().toLowerCase() + PIN_SECRET)`.
   - No se emplean dependencias externas pesadas.

2. **Propiedades de la Cookie de Sesión:**
   - Nombre sugerido: `couvance_session`
   - Opciones: `HttpOnly = true`, `Secure = true` (en producción), `SameSite = 'Lax'` (**Lax es requerido para soportar apertura directa de links desde WhatsApp en smartphones**), `Max-Age = 30 días` (2,592,000 s).
   - Token firmado con `PIN_SECRET` (HMAC-SHA256 o JWT ligero).

3. **Protección Anti-Fuerza Bruta (Rate Limiting en Memoria):**
   - Archivo: `src/server/middlewares/rate-limit.ts`
   - Aplica a rutas `/api/auth/*`.
   - Límite: Máximo 5 intentos fallidos por ventana de 15 minutos por IP (`cf-connecting-ip` || `x-forwarded-for` || `127.0.0.1`).
   - Superado el límite: `429 Too Many Requests`.

4. **Middleware de Rutas (`pinAuthMiddleware`):**
   - Aplica a todas las rutas bajo `/api/*`.
   - **Rutas Públicas Exentas:**
     - `POST /api/auth/unlock`
     - `GET /api/auth/questions`
     - `POST /api/auth/recover`
     - `POST /api/auth/reset-pin`
     - `GET /api/health`

---

## 📡 7. Especificación de Endpoints de la API

### Autenticación (`/api/auth`)
* `POST /api/auth/unlock` — Valida PIN de 8 dígitos. Retorna sesión o `401 Unauthorized` / `429 Too Many Requests`.
* `GET /api/auth/questions` — Retorna `{ q1: string, q2: string }` público (sin hashes).
* `POST /api/auth/recover` — Valida respuestas secretas. Retorna token temporal de recuperación (validez 10 min).
* `POST /api/auth/reset-pin` — Valida token temporal y actualiza `pin_hash` atómicamente en D1/SQLite.
* `POST /api/auth/lock` — Invalida y borra la cookie de sesión.

### Clientes (`/api/clients`)
* `GET /api/clients` — Listado de clientes con conteo de proyectos y saldos asociados.
* `POST /api/clients` — Crea cliente (validado con Zod: `name` obligatorio).
* `PUT /api/clients/:id` — Actualiza información o notas del cliente.
* `DELETE /api/clients/:id` — Elimina cliente; retorna `409 Conflict` si posee proyectos asociados.

### Proyectos & Showcase (`/api/projects`, `/api/showcase`)
* `GET /api/projects` — Listado de proyectos con filtros por estado (`status`).
* `GET /api/projects/:id` — Detalle del proyecto con cliente, presupuestos e hitos.
* `POST /api/projects` — Crea proyecto vinculado a cliente con categoría y recurrencia opcional.
* `PUT /api/projects/:id` — Actualiza campos. Si `status === 'CANCELLED'`, cancela en cascada hitos `PENDING`.
* `GET /api/showcase` — Consulta optimizada de portafolio (`COMPLETED` + `production_status = 'ACTIVE'`).

### Presupuestos e Hitos (`/api/projects/:id/budgets`, `/api/budgets`)
* `POST /api/projects/:id/budgets` — Crea presupuesto e hitos en estado `DRAFT` (valida 100% y enteros).
* `GET /api/projects/:id/budgets` — Historial de presupuestos del proyecto.
* `PUT /api/budgets/:id` — Edita presupuesto e hitos (solo en estado `DRAFT`).
* `POST /api/budgets/:id/approve` — Aprobación en 1 clic: presupuesto a `APPROVED`, proyecto a `IN_PROGRESS`, hitos a `PENDING`.
* `POST /api/budgets/:id/reject` — Marca presupuesto como `REJECTED`.
* `PATCH /api/milestones/:id/pay` — Marca hito individual como `PAID` con `paid_at = now()`.
* `POST /api/budgets/:id/pay-all` — Marca todos los hitos pendientes del presupuesto como `PAID`.

### Finanzas & Radar (`/api/finance`)
* `GET /api/finance/radar` — Retorna hitos `PENDING` ordenados por fecha y proyectos con recurrente a vencer en <30 días.
* `POST /api/projects/:id/renew` — Avanza `recurring_renewal_date` según `recurring_period` tras registrar cobro.
* `GET /api/finance/metrics` — Métricas globales: Total en la calle, Total cobrado, Saldo pendiente.

### Respaldo & Salud (`/api/backup`, `/api/health`)
* `GET /api/backup/export` — Descarga JSON con `CLIENTS`, `PROJECTS`, `BUDGETS`, `MILESTONES` (excluyendo `AUTH_CONFIG`).
* `GET /api/health` — Endpoint público de uptime y diagnóstico: `{ status: "ok", runtime: "node" | "cloudflare", uptime, timestamp }`.

---

## 💻 8. Guía de Ejecución y Scripts (`package.json`)

```json
{
  "scripts": {
    "dev": "vite",
    "dev:server": "tsx watch src/server/node-entry.ts",
    "build:client": "vite build --outDir dist/client",
    "build:server": "tsup src/server/node-entry.ts --format esm --out-dir dist/server --external better-sqlite3",
    "build": "npm run build:client && npm run build:server",
    "db:generate": "drizzle-kit generate",
    "db:migrate:local": "wrangler d1 migrations apply couvance-ops-db --local",
    "db:migrate:prod": "wrangler d1 migrations apply couvance-ops-db --remote",
    "start": "node dist/server/node-entry.js"
  }
}
```

### Ejecución con Docker
```bash
# Construir y levantar contenedor localmente con volumen persistente
docker compose up -d --build

# Verificar logs y migraciones automáticas
docker compose logs -f couvance-ops
```

---

## 🎨 9. Directrices de UI / Frontend (Anti-"AI Slop")

1. **Diseño sobrio y utilitario:**
   - Paleta neutra oscura/clara de alto contraste (zinc/neutral).
   - Bordes finos de 1px (`border-neutral-800` en tema oscuro).
   - Evitar degradados estridentes, sombras exageradas o tarjetas flotantes con radio excesivo.
2. **Interactividad:**
   - Modales limpios con Radix `Dialog`.
   - Menús contextuales con Radix `DropdownMenu`.
   - Notificaciones con `sonner` (`toast.success()`, `toast.info()`).
3. **Móvil Primero en Radar:**
   - El Radar de cobranza debe ser utilizable con una sola mano desde un smartphone para que los socios cobren en la calle.

---

## ⚠️ 10. Lista de Verificación para Agentes de Código

Antes de generar o modificar código en este repositorio, verifica:
- [ ] ¿El endpoint o función respeta el tipado estricto de TypeScript?
- [ ] ¿Los esquemas de entrada y salida están validados con **Zod**?
- [ ] ¿Se preservaron los montos de presupuestos e hitos como números enteros sin decimales?
- [ ] ¿El último hito absorbe cualquier residuo fraccionario del porcentaje?
- [ ] ¿Se mantiene la exclusión de `auth_config` en exportaciones de respaldo y endpoints públicos?
- [ ] ¿Las rutas públicas no están bloqueadas accidentalmente por `pinAuthMiddleware`?
- [ ] ¿No se añadieron librerías de animación pesadas (ej: Framer Motion) ni dependencias de C++ no permitidas (ej: `bcrypt`)?
- [ ] ¿El borrado de clientes verifica que no existan proyectos asociados devolviendo `409 Conflict`?
