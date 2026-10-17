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

- **S8 — Status transitions (authorized API change, L8).** User choice: "Corregir con reglas (Recommended)". The option they picked reads: "Aprobar/rechazar solo desde DRAFT o SENT (si no, 409). Pagar solo hitos PENDING (DRAFT o CANCELLED dan 409). Pagar un hito ya PAID responde 200 sin tocar la fecha original, así un doble toque en el celular no rompe nada. Cambia la API: los snapshots se actualizan a propósito." This is the only authorized contract change so far. The contract scenario never sends an S8-affected request, so its snapshots stayed unchanged; S8 is pinned by `test/budgets-transitions.test.ts` on both drivers (L12).

## Tasks

| ID | Specs | Slice / PR | Route | Status | Evidence |
|----|-------|-----------|-------|--------|----------|
| T1 | S2 | 01 safety-net | inline | done | `e2eda9c`: 28 contract tests / 90 snapshots, deterministic on re-run |
| T2 | S2 | 01 safety-net | inline | done | `da03958`: E2E 9/9 passed on two consecutive runs |
| T3 | S4, S5 | 02 server-infra | inline | done | `18bf098` D1 contract run, `0842675` helpers + runAtomic; verifier PASS S2/S4/S5 (217 probes, 0 diffs); RDD review approved (3 lenses, 0 findings) |
| T4 | S4, S5, S8 | 03 budgets | inline | done | `46217cf` test DB helper, `0de7f18` budgets layered + S8; gate green (L11); verifier PASS S2/S4/S5/S8 (142 probes × 2 drivers, only authorized S8 diffs); RDD review approved (3 lenses, 0 blockers) (L12) |
| T5 | S4, S5 | 04 projects | inline | done | `e784a82`: RED→GREEN `test/projects-cancel.test.ts` (atomic cancel, both drivers); contract snapshots unchanged; gate green (L14) |
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
- **L14 (2026-10-17):** Slice 04 (`refactor/arch-04-projects`, stacked on slice 03), commit `e784a82` (T5).
  - Projects split into `domain`/`schemas`/`repository`/`service`/`routes`. `showcase.ts` is HTTP only and reuses the projects service.
  - One renew implementation (`renewProjectResponse`) serves `/api/projects/:id/renew` and both `/api/finance` aliases. The aliases keep their previous id handling (no `requireId`): adding it would turn their 404 into a 400, which S2 does not authorize.
  - Cancellation goes through `runAtomic`. The project update and the PENDING→CANCELLED cascade run in one unit; the cascade is a single UPDATE with an SQL subquery, because `select({...})` with arguments does not typecheck on the `D1Db | SqliteDb` union.
  - The project detail loads budgets with milestones through the budgets repository, so that loading exists once (S4). `ServiceClock` moved to `shared/clock.ts`.
  - RED: `test/projects-cancel.test.ts` forces a cascade failure with a SQLite trigger. Before the fix the project stayed `CANCELLED` on both drivers; after it, it stays `IN_PROGRESS`. A second test pins RN-05: PAID milestones and their `paidAt` are untouched.
  - Gate: vitest 13 files / 140 passed (contract snapshots unchanged on SQLite and D1); `tsc` OK; build OK; E2E 9 passed; wrangler Edge bundle exit 0, 0 `better-sqlite3` refs.
  - Risk: none. The contract is unchanged, as the snapshots prove for every projects, renew and showcase endpoint on both drivers. The cascade's stored result is the same; it is only atomic now.
  - RDD assess (base `0de7f18`, committed-only): medium, `review_due: false`, `under_budget`. The slice stays pending until a later commit reaches the budget.
  - Deferred (L12 follow-up): the S8 check-then-act guards stay as they are. Closing the race needs the expected status in each UPDATE plus a way to detect 0 affected rows inside a batch. That is a behavior change under concurrency only, so it is not part of a contract-preserving refactor.
- **L13 (2026-10-17):** User: "ah no hemos terminado? bueno pero termina todo el refactor de odd y al final nos organizamos para armar el ci cd y de ahi hacemos push que te parece?" Plan: finish T5–T12 as local stacked branches, then set up CI/CD together, then push and open the chained PRs in order.
- **L12 (2026-10-17):** T4 verification and review closed.
  - Independent verifier: baseline `4ec5f13` vs candidate `0de7f18`. It sent 142 HTTP probes per driver, on SQLite and on local D1. S2/S4/S5/S8 PASS, no blockers.
    - Every diff is an authorized S8 change: approve/reject from APPROVED or REJECTED now returns 409; paying a DRAFT milestone returns 409 (it used to pay it); paying a CANCELLED one returns 409 (it used to be 400, same message); paying a PAID one keeps the original `paidAt`.
    - Every 4xx left the table dump byte-identical. RN-01, RN-03 and RN-05 still hold.
    - Mutation check: replacing `runAtomic` with sequential awaits fails 4 of 6 tests in `test/budgets-repository.test.ts` on both drivers, so that test really guards S5.
  - Correction to L7: the contract scenario never re-pays a PAID milestone, so that statement was wrong. S8 text updated accordingly.
  - Parent spot check: `npx vitest run test/budgets-transitions.test.ts test/budgets-repository.test.ts test/api-contract.test.ts` → 81 passed. The verifier's `node_modules` junctions were removed as junctions (checked with `LinkType`) before its scratch folder was deleted.
  - RDD: review on base `0842675`, committed-only, `.claude/` excluded, lenses risk/resilience/reliability. Consent granted by the user. Approved with 0 blockers and acknowledged (lineage `review-fc0baa518806bca0`). Reviewed boundary is now `0de7f18`.
  - My first START, launched through `node spawnSync`, failed to resolve the repo root (`operation_outcome_unknown`). Bound STATUS showed no transaction had been created; a fresh preflight, with START run as the exact bash command, worked.
  - Follow-ups (advisory, non-blocking, not regressions):
    - The S8 guards are check-then-act. `approve`/`reject`/`pay` update by id only, so concurrent requests (approve vs reject, pay vs project cancel) can bypass the rule. Fix: add the expected status to the UPDATE's WHERE. Candidate for T5, which touches the cancel cascade.
    - The milestones `inArray` over a project's budget ids could hit D1's 100-parameter limit past about 100 budgets per project (out of domain).
    - A trim suggestion on PUT (`service.ts:30`).
  - Pre-existing, unchanged: malformed JSON returns `400 "Expected object, received null"`; the 500 body includes the stack with absolute paths.
- **L11 (2026-10-17):** Slice 03 (`refactor/arch-03-budgets`, stacked on slice 02) committed.
  - `46217cf`: `test/helpers/db.ts` builds a migrated SQLite or local D1 for tests; the contract harness and the `runAtomic` tests reuse it.
  - `0de7f18` (T4): budgets split into `domain`/`schemas`/`repository`/`service`/`routes`; create and edit run through `runAtomic`; services throw `DomainError` (`shared/errors.ts`), which `handleHttpError` maps to 400/404/409; S8 transitions enforced. Docs: layer convention in `CLAUDE.md`, S8 rules in `agents.md`.
  - The contract snapshots did not change: the scenario never hits the S8 paths. S8 is pinned by `test/budgets-transitions.test.ts` on both drivers; atomic create/edit by `test/budgets-repository.test.ts`.
  - Gate: vitest 12 files / 136 tests passed; `tsc` OK; `npm run build` OK; E2E 9 passed; `wrangler pages functions build --compatibility-flags nodejs_compat` exit 0, 0 `better-sqlite3` refs.
  - Risk: item 3 (`handleHttpError` is shared by every endpoint through `app.onError`; budgets contract changes per S8). RDD assess on base `0842675`, committed-only, `.claude/` excluded: high, `review_due: true`. Independent verifier launched before the review.
- **L10 (2026-10-16):** T3 verification and review closed.
  - Independent verifier: baseline `18bf098` vs candidate `0842675`, 217 compared records (215 HTTP probes, a DB dump and a console capture), 0 diffs. It covered malformed bodies on 12 endpoints, 16 id routes × 5 ids, id-vs-body precedence, 401s, the rate-limit sequence, a closed DB (500 shape) and approval end to end. S2/S4/S5 PASS, no blockers. Advisories: the default `parseBody` fallback is never observable; the finance renew aliases skip `requireId` (pre-existing, scheduled for T5).
  - Parent spot check: `npx vitest run test/server-infra.test.ts test/api-contract.test.ts` → 65 passed. The verifier's scratch junctions were removed before deleting the folder; the repo `node_modules` is intact.
  - RDD: review on base `18bf098`, committed-only, untracked `.claude/` excluded, lenses risk/resilience/reliability. Consent granted by the user. Approved with 0 findings and acknowledged (lineage `review-c44743a698b1dec7`). Reviewed boundary is now `0842675`.
  - Note: the reliability capture first failed to launch (my capture list had no trailing newline). It was relaunched only after the bound STATUS re-offered that exact slot.
- **L8 (2026-10-16):** Status-transition decision. The user picked "Corregir con reglas (Recommended)", so S8 was added and T4 now covers it.
- **L9 (2026-10-16):** Slice 02 progress (`refactor/arch-02-server-infra`, stacked on slice 01).
  - `18bf098`: the contract suite now also runs on a real local D1 (wrangler `getPlatformProxy`). Its 90 snapshots are identical to SQLite and to the slice 01 baseline.
  - `0842675` (T3): shared `HttpError`/`requireId`/`parseBody` adopted in auth, budgets, clients and projects; `runAtomic` replaces the approval duck typing, with commit and rollback tested on both drivers; crypto moved to `shared/`; `openSqliteDb` dedupe; dead sanitize helpers deleted; docs corrected (bodies never used `sanitizedText`).
  - Gate: vitest 10 files / 111 tests passed; `tsc` OK; `npm run build` OK; E2E 9 passed. `wrangler pages functions build --compatibility-flags nodejs_compat` → exit 0 and the bundle has 0 `better-sqlite3` refs. Without the flag the build also fails on the baseline, so that failure is a tooling detail, not a regression.
  - Gap noted: `tsc` does not typecheck `test/` (tsconfig `include`).
  - Risk: item 3 (shared validation and error mapping used by every endpoint). RDD assess on base `18bf098`: high, `review_due: true`. An independent verifier was launched before the review.
- **L7 (2026-10-16):** Slice 01 (`refactor/arch-01-safety-net`) complete.
  - Commits: `2988ae2` docs (CLAUDE.md CORS), `e2eda9c` T1, `da03958` T2.
  - Gate: `npx vitest run` → 9 files / 74 tests passed. `npx tsc --noEmit` → OK. `npm run build` → client and server built. `npx playwright test` → 9 passed twice in a row.
  - T1 detail: the first snapshot pass had an empty `recurringAlerts`, so a non-renewed monthly project was added to cover the radar. Snapshots pin current behavior, including re-paying a PAID milestone (open decision) and the renew month overflow for `2026-01-31`.
  - T2 detail: besides the data isolation (port 3101, fresh temp DB, no server reuse), the two failing specs had broken locators: the outermost div matched by `hasText`, and `getByLabelText`, which is not a Playwright API. The app's `FormField` already injects the id into its child (`Input.tsx:114-115`).
  - Out of scope, noted for T10: in create mode the `FormField` child is a wrapper `div`, so the "Cliente Asociado" `<select>` is not associated with its label.
  - RDD assess (base `e592742`, committed-only, untracked `.claude/` excluded): risk medium, `review_due: false`, reason `under_budget`. The reviewed boundary stays at `e592742`.
  - Authored lines: about 650; the remaining roughly 2,200 lines are a generated snapshot file.
  - Risk: none (tests, test config and docs only; no production code).
  - Next: push and PR #1 are the user's decision; T3 starts on `refactor/arch-02-server-infra` stacked on slice 01.
- **L6 (2026-10-16):** User: "recuerda que no tengo CI CD en el repo de github". Every slice runs the full local gate before commit/PR: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run test:e2e`. Results are recorded here and in the PR body. Merging to `main` does not deploy unless Cloudflare Pages Git integration is enabled (unconfirmed).
- **L5 (2026-10-16):** Branch `refactor/arch-01-safety-net` created. The pending `CLAUDE.md` fix (CORS removed from the middleware chain) rides in this slice as its own docs commit.
