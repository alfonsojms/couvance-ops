# Layered architecture refactor (backend + frontend)

Objective: remove spaghetti code by moving backend modules to domain / repository / service / routes layers and splitting large React pages, without changing the HTTP API contract used in production (Cloudflare Pages + D1).
Branch: one branch per slice, `refactor/arch-NN-<slug>` off `main`. Delivery: `ask-on-risk` → chain strategy `stacked-to-main` (each PR merges to `main` and deploys alone). Test runner: Vitest (`npm test`), Playwright (`npm run test:e2e`), `npx tsc --noEmit`.

## Specs

- **S1 — Goal.** "podemos proceder a arreglar la arquitecura para eliminar el codigo spaguetti" (L1). Scope chosen by the user: "Backend + frontend" (L2).
- **S2 — Production safety.** The user asked "cuanto costaria y que tanto riesgo hay de romper produccion?" (L0). Every slice must keep the HTTP contract the SPA consumes unchanged (paths, status codes, JSON fields, `{ error }` error shape) unless a later Log entry authorizes a change. Characterization tests pin current behavior before any module is moved.
- **S3 — Delivery.** Chain strategy chosen: "Stacked a main (Recommended)" (L3). Each slice is about 400 authored changed lines, deployable alone, with tests and docs in the same slice.
- **S4 — Backend layering.** Each module in `src/server/modules/<name>/` ends with: pure domain rules (no Hono, no Drizzle), Zod schemas, a repository (Drizzle queries over `AppDatabase`), a service (use cases returning results, no HTTP), and routes (HTTP only). Duplicated helpers (ID validation, JSON body parsing, 404s, totals, budget+milestones loading, token signing) exist once.
- **S5 — Atomic writes.** Multi-table writes run atomically on both drivers through one typed helper (D1 `batch`, better-sqlite3 `transaction`). Today only approve is atomic; budget create, budget edit and project cancel are not (explorer map, Log L4).
- **S6 — Frontend layering.** Large pages (`Projects.tsx` 917 lines, `Dashboard.tsx` 855) are split into data hooks and presentational components (container/presentational), with a typed API client per resource. Visual design and behavior do not change.
- **S7 — Docs.** `CLAUDE.md` and `agents.md` describe the final architecture.

Assumptions (not user requirements): layer file names (`domain.ts`, `schemas.ts`, `repository.ts`, `service.ts`, `routes.ts`); `index.ts` keeps exporting the Hono sub-app so `app.ts` mounts stay stable.

Open decision (ask when T4 starts): unchecked status transitions (paying an already PAID milestone again overwrites `paidAt`; approve/reject accept any status). Fixing them changes API behavior, so it needs the user's approval.

## Tasks

| ID | Specs | Slice / PR | Route | Status | Evidence |
|----|-------|-----------|-------|--------|----------|
| T1 | S2 | 01 safety-net | inline | in progress | |
| T2 | S2 | 01 safety-net | inline | pending | |
| T3 | S4, S5 | 02 server-infra | inline | pending | |
| T4 | S4, S5 | 03 budgets | inline | pending | |
| T5 | S4, S5 | 04 projects | inline | pending | |
| T6 | S4 | 05 finance-clients | inline | pending | |
| T7 | S4 | 06 auth-backup | inline | pending | |
| T8 | S6 | 07 client-api | inline | pending | |
| T9 | S6 | 08 dashboard | inline | pending | |
| T10 | S6 | 09 projects-page | inline | pending | |
| T11 | S6 | 10 remaining-pages | inline | pending | |
| T12 | S7 | each slice + final | inline | pending | |

- **T1** Characterization tests (Vitest, in-memory SQLite) for every endpoint the SPA consumes that has no coverage today: clients GET/PUT, projects GET list totals and renew, budgets list and pay-all, finance radar/metrics/history, showcase, backup export (no `auth_config`), auth questions/recover/reset-pin/lock/status/settings/change-pin/update-questions. Shared test helper to build the app over a fresh DB.
- **T2** Isolate the E2E database per run (Playwright `webServer` with its own `DATABASE_URL`), so the 3 E2E specs that fail today from accumulated data pass again.
- **T3** Shared server infrastructure: HTTP helpers (ID param, JSON body, not-found), typed `runAtomic` with tests for both the `batch` and `transaction` paths, typed Hono context (`db` no longer `any`), remove dead code (`getSqliteDb`, unused sanitize helpers) and the DB layer's import from the auth middleware.
- **T4** Budgets module layered; create and edit become atomic.
- **T5** Projects + showcase layered; single renew implementation; cancel cascade atomic; shared totals.
- **T6** Finance + clients layered; reuse totals; drop `as SqliteDb` casts and local try/catch.
- **T7** Auth + backup layered; one token-signing helper; `auth_config` repository.
- **T8** Typed frontend API client per resource and shared response types.
- **T9** Dashboard split into hooks and components.
- **T10** Projects page and ProjectFormDialog split.
- **T11** Clients, Unlock, SecuritySettingsModal, Showcase cleanup.
- **T12** Docs updated alongside each slice; final architecture section in `CLAUDE.md` and `agents.md`.

Route evidence: all tasks inline. No Writer-trigger reason holds yet. Each slice depends on the previous one, so no units run in parallel, and the parent context is below the backstop.

## Log

- **L0 (2026-10-16, earlier request):** "la arquitectura refactorizar eso cuanto costaria y que tanto riesgo hay de romper produccion?"
- **L1 (2026-10-16, original request):** "ahora bien ya tienes las skills cargadas podemos proceder a arreglar la arquitecura para eliminar el codigo spaguetti podemos usad sdd o odd ya que es una tarea semicompleja"
- **L2 (2026-10-16):** Scope answer: "Backend + frontend".
- **L3 (2026-10-16):** Delivery answer: "Stacked a main (Recommended)". Forecast is well above 400 authored lines (about 1,700 backend and 2,500 frontend lines involved).
- **L4 (2026-10-16):** Explorer map. Backend duplication: ID validation 14×; JSON parse, 404 and totals 3×; renew exposed 3× (2 routes without ID validation). Only approve is atomic. The D1 `batch` path is untested. Radar, metrics, projects list totals, pay-all, backup and most auth endpoints have no tests. Spot check confirmed budget edit deletes and re-inserts milestones without a transaction (`budgets/index.ts:207-240`).
- **L6 (2026-10-16):** User: "recuerda que no tengo CI CD en el repo de github". Every slice runs the full local gate before commit/PR: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run test:e2e`. Results are recorded here and in the PR body. Merging to `main` does not deploy unless Cloudflare Pages Git integration is enabled (unconfirmed).
- **L5 (2026-10-16):** Branch `refactor/arch-01-safety-net` created. The pending `CLAUDE.md` fix (CORS removed from the middleware chain) rides in this slice as its own docs commit.
