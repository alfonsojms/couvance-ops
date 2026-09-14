# ⚡ Kodex Ops — Motor Operativo & Radar de Cobranzas para Agencias

> **Resumen Ejecutivo:** Kodex Ops es una herramienta interna de ingeniería diseñada específicamente para los 2 socios directores de la agencia digital **Kodex**. Su propósito es eliminar la fricción administrativa en cobros, control de proyectos y renovaciones de hosting/mantenimiento, priorizando velocidad de ejecución con una sola mano en smartphones, costo de infraestructura $0 y cero tolerancia al software inflado ("anti-AI slop").

---

## 🎯 ¿Por qué existe este proyecto? (El Problema Real)

Las agencias digitales pequeñas no quiebran por falta de trabajo; quiebran por **desfase de flujo de caja (*cashflow drag*)**:
1. **Cobros en el limbo:** Hitos de desarrollo terminados que nadie cobra a tiempo porque revisar facturas en un ERP corporativo (Notion, Jira, HubSpot) toma demasiados clics.
2. **Renovaciones olvidadas:** Dominios, servidores e hitos de mantenimiento que expiran sin facturarse al cliente, costando miles de dólares al año en fugas silenciosas.
3. **Fricción en calle:** Cobrar a un cliente por WhatsApp mientras estás en un taxi o en una reunión requiere buscar el monto exacto, copiar el texto cordial y abrir WhatsApp manualmente.

**Kodex Ops resuelve esto transformando el cobro en una acción de 1 segundo:**
- **Radar de Cobranzas:** Un tablero que ordena hitos pendientes por fecha y alerta con 30 días de anticipación de cualquier servicio recurrente por vencer.
- **Cobro Express WhatsApp:** Un botón que genera y abre directamente el enlace `wa.me` con el monto, proyecto e hito codificado, con fallback inteligente al portapapeles si el cliente no tiene teléfono registrado.
- **Aprobación & Liquidación en 1 Clic:** Un presupuesto aprobado transiciona atómicamente el proyecto a "En Progreso" y los hitos a "Pendiente". Un botón "Cobrar Todo" liquida hitos simultáneos sin burocracia.

---

## 🏗️ Arquitectura Técnica & Decisiones de Ingeniería

El proyecto está diseñado bajo un principio de **monolito modular agnóstico del runtime**, capaz de ejecutarse idénticamente en la nube serverless o en hardware local:

```mermaid
flowchart TD
    subgraph Client [Frontend SPA - React 18.3 + Vite 6]
        UI[Design System Impeccable<br/>Radix UI + Tailwind CSS]
        Unlock[Desbloqueo PIN 6 dígitos<br/>Teclado físico + CSS Shake]
        Radar[Radar de Tesorería<br/>Desacoplamiento cromático WhatsApp]
    end

    subgraph Entrypoints [Adaptadores de Entrada HTTP]
        CFPages[Cloudflare Pages Functions<br/>functions/api/[[route]].ts]
        NodeServer[@hono/node-server<br/>src/server/node-entry.ts]
    end

    subgraph Backend [Backend Core - Hono TS]
        Router[Router Hono Modular<br/>src/server/modules/*]
        AuthMW[pinAuthMiddleware<br/>Sesión Lax 30d + Rate Limiter]
        Rules[Motor de Reglas de Negocio<br/>RN-01 a RN-10]
    end

    subgraph Persistence [Persistencia Agnóstica Drizzle ORM]
        D1[(Cloudflare D1<br/>SQLite Serverless Edge)]
        SQLite[(better-sqlite3 WAL<br/>/app/data/kodex-ops.db)]
    end

    Client -->|Peticiones HTTP JSON| CFPages
    Client -->|Peticiones HTTP JSON| NodeServer
    CFPages --> Router
    NodeServer --> Router
    Router --> AuthMW
    AuthMW --> Rules
    Rules -->|c.env.DB| D1
    Rules -->|Local getSqliteDb| SQLite
```

### 1. Ejecución Dual Agnóstica (Cloudflare Edge vs. Node.js Docker)
- **Producción Serverless ($0 TCO):** Corre sobre **Cloudflare Pages Functions** y **Cloudflare D1**. Cero servidores que parchar, latencia ultra-baja en el edge y tier gratuito permanente para el volumen de la agencia.
- **Autonomía On-Premise / Local:** El mismo backend corre sobre Node.js con `@hono/node-server` y `better-sqlite3` en modo `WAL` (Write-Ahead Logging) dentro de un contenedor Docker multi-stage (`node:20-slim`).
- **Factoría de Persistencia Unificada:** [`src/server/db/index.ts`](src/server/db/index.ts) detecta el runtime (`c.env.DB` para D1 o instancia local SQLite) y expone la misma API tipada con **Drizzle ORM**, incorporando auto-sembrado inicial ante bases de datos recién migradas.

### 2. Criptografía Nativa con Web Crypto (Cero Binarios C++)
- **El reto:** Librerías estándar como `bcrypt` o `argon2` requieren binarios compilados en C++, incompatibles con el entorno V8 aislado de Cloudflare Workers/Pages.
- **La solución:** Implementación criptográfica basada en el estándar W3C **Web Crypto API** (`crypto.subtle`):
  - Hashing con SHA-256 + secreto pepper (`PIN_SECRET`).
  - Firmas de sesión HMAC-SHA256 seguras.
  - Prevención de ataques de temporización (*timing attacks*) mediante comparación en tiempo constante (`timingSafeEqual`).
  - Cookie de sesión `kodex_session` con `SameSite: 'Lax'` (imprescindible para que el navegador no invalide la sesión al saltar de WhatsApp de vuelta a la app) y duración de 30 días.

### 3. Rigor Financiero: Las 10 Reglas de Negocio (RN-01 a RN-10)
En finanzas de agencia, los errores de redondeo destruyen la confianza contable. Kodex Ops implementa invariantes estrictas:
- **RN-01 (Sin Decimales & Conciliación de Residuos):** Presupuestos e hitos son estrictamente enteros. La distribución de porcentajes enteros (ej: 34%, 33%, 33%) calcula montos monetarios enteros redondeados y **fuerza al último hito a absorber cualquier diferencia fraccional**, garantizando que $\sum \text{hitos} \equiv \text{total}$ con exactitud matemática.
- **RN-02 (Regla de Oro del 100%):** La suma de los porcentajes enteros de un presupuesto debe ser exactamente 100%, validada en Zod tanto en cliente como en servidor.
- **RN-03 (Aprobación Atómica en 1 Clic):** `POST /api/budgets/:id/approve` ejecuta una transacción atómica (D1 `batch` o SQLite `transaction`) que pasa el presupuesto a `APPROVED`, el proyecto a `IN_PROGRESS` y los hitos a `PENDING`.
- **RN-04 (Cobro Express Pay-All):** Liquidación de todos los hitos pendientes con timestamp de pago en un solo toque.
- **RN-05 (Cancelación No Destructiva):** Si un proyecto se cancela, se cancelan los hitos pendientes pero **se preservan intactos los hitos pagados (`PAID`)**, salvaguardando el histórico tributario y de ingresos.
- **RN-06 (Integridad Referencial 409):** `DELETE /api/clients/:id` verifica que el cliente tenga cero proyectos. Si tiene proyectos asociados, responde `409 Conflict` impidiendo la corrupción de relaciones.
- **RN-07 (Criterio de Showcase):** Portafolio público solo expone proyectos `COMPLETED` con web activa (`ACTIVE`) y URL comprobada.
- **RN-08 (Radar de Recurrentes a 30 Días):** Detección proactiva de servicios de hosting o mantenimiento próximos a vencer.
- **RN-09 (WhatsApp & Portapapeles):** Generación de enlace directo a API de WhatsApp o copia automática al portapapeles con toast Sonner.
- **RN-10 (Seguridad en Exportación JSON):** El respaldo (`/api/backup/export`) extrae clientes, proyectos, presupuestos e hitos, pero **excluye taxativamente `auth_config`** y cualquier hash.

---

## 🎨 Frontend: Filosofía Anti-"AI Slop" & Ergonomía

Diseñado con la metodología **Spec-Driven Design (SDD)** documentada en `PRODUCT.md` y `DESIGN.md`:

| Característica | Implementación de Ingeniería | Beneficio de Negocio |
| :--- | :--- | :--- |
| **Cero Bloat en Animaciones** | Prohibido Framer Motion. Transiciones CSS nativas de 150ms aceleradas por GPU. | Bundle JS ultraligero (~339 kB total) y renderizado fluido a 60 FPS en smartphones. |
| **Desacoplamiento Cromático** | Botón de WhatsApp en verde esmeralda (`#25D366`) vs. botón "Cobrado" en gris secundario neutro con icono check. | **Previene cobros falsos accidentales.** El operador nunca confunde el botón de contacto con el de asentar el cobro en el sistema. |
| **Desbloqueo Ultrarrápido (0.8s)** | Listener de teclado físico global (`0-9`, `Backspace`, `Escape`, `Enter`) en `Unlock.tsx`. | El socio en su laptop desbloquea el sistema en menos de un segundo sin levantar las manos hacia el ratón. |
| **Touch Targets Móviles** | Controles y botones con área mínima de contacto de $44 \times 44$ px (`touchFriendly`). | Operabilidad precisa con el pulgar mientras se camina por la calle. |
| **Semáforo Dinámico de Urgencia** | Badges calculados al vuelo: Rose (Vencido), Ámbar (Vence $\le 2$ días), Neutral (Futuro). | Jerarquía visual inmediata de dónde está retenido el capital de la agencia. |
| **Generador de Fichas de Venta** | Botón en 1 clic en Showcase que formatea una propuesta visual lista para enviar por WhatsApp a prospectos. | Conversión comercial acelerada durante reuniones de prospección. |

---

## 📂 Estructura del Código

```text
kodexops/
├── drizzle/                    # Migraciones SQL generadas por Drizzle Kit
├── functions/api/[[route]].ts  # Entrypoint Edge para Cloudflare Pages Functions
├── src/
│   ├── server/                 # BACKEND (Hono + Drizzle)
│   │   ├── db/                 # Conectores agnósticos (D1, SQLite WAL, schemas, seed)
│   │   ├── middlewares/        # Auth Web Crypto, Rate Limiting en memoria
│   │   ├── modules/
│   │   │   ├── auth/           # Login PIN, preguntas secretas, cambio de PIN en sesión
│   │   │   ├── clients/        # Directorio de clientes & protección 409
│   │   │   ├── projects/       # Proyectos, cancelación no destructiva & showcase
│   │   │   ├── budgets/        # Presupuestos, hitos, residuo entero, aprobación 1-clic
│   │   │   ├── finance/        # Radar de cobranzas, renovaciones recurrentes & KPIs
│   │   │   └── backup/         # Exportación JSON higienizada
│   │   ├── app.ts              # Instancia central Hono & enrutador API
│   │   └── node-entry.ts       # Entrypoint Node.js/Docker con auto-migración y seed
│   │
│   └── client/                 # FRONTEND (React 18.3 + Vite 6 + Tailwind CSS)
│       └── src/
│           ├── components/
│           │   ├── ui/         # Design System Atómico (Button, Badge, Card, Dialog, Input, MetricCard)
│           │   ├── Navbar.tsx  # Navegación con descarga de respaldo y modal de seguridad
│           │   ├── NumericKeypad.tsx         # Teclado numérico táctil accesible
│           │   ├── SecuritySettingsModal.tsx # Gestión de PIN maestro y preguntas secretas
│           │   └── WhatsAppButton.tsx        # Botón inteligente con fallback a portapapeles
│           ├── hooks/
│           │   └── useAuth.ts  # Estado de sesión y verificación de autenticación
│           ├── pages/
│           │   ├── Dashboard.tsx   # Radar de cobranzas & métricas monumentales
│           │   ├── Projects.tsx    # Gestión de proyectos, cotizador 50/50 y 40/30/30
│           │   ├── Showcase.tsx    # Catálogo de ventas & ficha WhatsApp para prospectos
│           │   ├── Clients.tsx     # Directorio de clientes con protección de integridad
│           │   └── Unlock.tsx      # Teclado numérico PIN y recuperación con preguntas
│           └── lib/
│               ├── api.ts      # Cliente HTTP tipado
│               └── utils.ts    # Utilidades wa.me y copia segura al portapapeles
│
├── Dockerfile                  # Multi-stage build optimizado (node:20-slim)
├── docker-compose.yml          # Especificación con volumen persistente kodex_data
├── wrangler.toml               # Configuración Cloudflare Pages & binding D1
├── drizzle.config.ts           # Configuración de Drizzle Kit
├── vite.config.ts              # Configuración de Vite con proxy /api hacia backend
├── .env.example                # Plantilla de variables de entorno y secretos
├── package.json
└── tsconfig.json
```

---

## ⚖️ Análisis Crítico & Compromisos de Ingeniería (La Verdad sin Filtros)

Para un evaluador técnico o reclutador senior, lo que se decide omitir deliberadamente es tan relevante como lo implementado:

### ✅ Decisiones que Demuestran Criterio Senior:
1. **No sobre-ingeniería innecesaria:** Para una herramienta operativa interna de 2 socios, implementar microservicios, Kubernetes o SSO con Auth0/Okta habría sido un despilfarro injustificado. Un PIN maestro protegido con HMAC-SHA256, cookie `SameSite=Lax` y recuperación por preguntas secretas resuelve el 100% de la necesidad con cero fricción.
2. **Respeto a las limitaciones del Edge:** Cero dependencias nativas de Node (`fs`, `child_process`, `bcrypt`) en el núcleo compartido. El backend completo es isomórfico y corre de forma idéntica en Cloudflare Pages Functions y Node.js.
3. **Modelado financiero defensivo:** La absorción del residuo entero en el último hito garantiza consistencia contable exacta frente a redondeos matemáticos.

### ⚠️ Trade-offs y Deuda Técnica Deliberada:
1. **Monotenant / Acceso Compartido:** El sistema está diseñado para un acceso ágil compartido entre socios mediante un PIN común de 6 dígitos. No cuenta con RBAC (control de acceso por roles) ni separación multi-empresa.
2. **Estrategia de Pruebas Actual:** Siguiendo la premisa de máxima velocidad sin sobreingeniería en esta fase, la garantía de corrección recae en el tipado estricto de TypeScript (`0 errores`), validación exhaustiva de esquemas Zod en todos los endpoints y transacciones atómicas de base de datos. **No cuenta actualmente con una suite automatizada de tests (Vitest/Jest) ni pipeline de CI/CD**. Una suite formal de integración e2e es el compromiso inmediato en el roadmap V2.
3. **Rate Limiting en Edge vs. Node:** El limitador de fuerza bruta en memoria (`rate-limit.ts`) opera de forma estricta en el proceso único de Node.js/Docker, mientras que en Cloudflare Pages actúa como mitigación oportunista por cada isolate efímero de V8.
4. **Escalabilidad de Base de Datos:** SQLite (WAL) y D1 están optimizados para lectura intensiva y concurrencia baja/media. Para miles de transacciones de escritura simultáneas se requeriría una base de datos distribuida (PostgreSQL/Spanner), lo cual excede por completo el alcance de esta herramienta interna.

---

## 🚀 Puesta en Marcha Rápida

### Requisitos
- Node.js $\ge 20$
- npm $\ge 10$
- Docker & Docker Compose (opcional)

### 1. Desarrollo Local
```bash
# Clonar e instalar dependencias
git clone https://github.com/tu-usuario/kodexops.git
cd kodexops
npm install

# Copiar variables de entorno
cp .env.example .env

# Terminal 1: Iniciar backend (Node + SQLite en ./data)
npm run dev:server

# Terminal 2: Iniciar frontend (Vite)
npm run dev
```
- **Frontend SPA:** `http://localhost:5173` (redirige llamadas `/api` a `http://localhost:3000` mediante el proxy de Vite).
- **Backend API Directa:** `http://localhost:3000`.

> **Credenciales Iniciales por Defecto:**
> - **PIN Maestro:** `123456`
> - **Pregunta Secreta 1:** `¿Cuál es el nombre de tu primera mascota?` &rarr; `kodex`
> - **Pregunta Secreta 2:** `¿En qué ciudad se fundó la agencia?` &rarr; `valencia`

---

### 2. Ejecución Autónoma con Docker
```bash
docker compose up -d --build
```
La aplicación compilará cliente y servidor, ejecutará las migraciones automáticamente en el arranque y levantará la aplicación lista en `http://localhost:3000` con persistencia en el volumen `kodex_data`.

---

### 3. Despliegue en Cloudflare Pages & D1

1. **Crear la base de datos D1 en Cloudflare:**
   ```bash
   npx wrangler d1 create kodex-ops-db
   ```
   Copia el `database_id` generado y colócalo en `wrangler.toml`.

2. **Aplicar las migraciones de base de datos a D1:**
   ```bash
   npm run db:migrate:prod
   ```

3. **Configurar el secreto maestro de sesión:**
   ```bash
   npx wrangler pages secret put PIN_SECRET
   ```

4. **Compilar el frontend y desplegar:**
   ```bash
   npm run build:client
   npx wrangler pages deploy dist/client
   ```
> *Nota:* En Cloudflare Pages, el sistema auto-siembra las credenciales iniciales (`123456`) en la primera petición de autenticación si la base de datos está vacía.

---

## 📊 Métricas de Build & Calidad

- **TypeScript:** 0 errores en compilación estricta (`npx tsc --noEmit`).
- **Bundle Frontend:** 28.02 kB CSS / 339.46 kB JS (Vite v6 sobre React 18.3).
- **Bundle Servidor:** 57 kB bundle ESM autónomo (tsup).
- **Rendimiento UI:** Auditoría local en Google Chrome DevTools / Lighthouse Mobile sobre el contenedor de producción arrojando $\ge 98/100$ en Performance gracias a la ausencia de librerías de animación pesadas.
