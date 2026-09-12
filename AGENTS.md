# SIGAP - Sistem Informasi Guru, Absensi, dan Prestasi

> **Skills:** Deep-dive procedures live in [`.agents/skills/`](./.agents/skills/SKILL.md) — load on demand.

## AI Quickstart — First time here?

Read in this order (each builds on the previous):

1. **[CODEMAP.md](./CODEMAP.md)** — codebase topology in one read. Know what exists before searching.
2. **This file** — conventions, anti-patterns, dependency policy, common pitfalls, structure. ~270 lines.
3. **[`routes/web.ts`](./routes/web.ts)** — all routes in one file. API surface at a glance.
4. **[`.agents/skills/SKILL.md`](./.agents/skills/SKILL.md)** — skill index. Load relevant skill when touching that pattern.
5. **[`docs/decisions/`](./docs/decisions/README.md)** — ADRs explain WHY decisions were made. Read when questioning a convention.

For database schema: `ls migrations/` to see table names, read the specific migration file for column types and constraints.

Then verify your work with one command:
```bash
npm run check    # lint + typecheck + layer lint + tests
```

Scaffold a new resource with one command:
```bash
npm run gen:resource products -- --fields="name:string,price:number"
```

## Overview

AI-first TypeScript full-stack starter kit. Functions over classes, raw SQL over ORM, minimal abstractions.

- **Backend**: ultimate-express (uWebSockets.js) + better-sqlite3
- **Frontend**: Svelte 5 + Inertia.js + Zag JS (headless UI)
- **Auth**: Session-based + RBAC
- **Validation**: Zod

## Philosophy

- **No classes** — functions only
- **No unnecessary comments** — code is self-documenting
- **No abstractions** — inline is fine
- **Raw SQL** — AI writes SQL, we just execute it
- **Minimal code** — less code = less bugs

## Golden Principles

> Opinionated, mechanical rules that keep the codebase legible for agents. Enforced by lint:layers, check:agents, check:security, or convention tests. Violations block commit.

1. **Functions over classes** — `export const fn = () => ...` or `export function fn()`. Never `class`. (ADR 0002, enforced structurally)
2. **Raw SQL over ORM** — write SQL in `queries/`, never use Prisma/Drizzle/Knex. (ADR 0001, dependency policy)
3. **Descriptive handler names** — `createUser`, `addRole`, `listProducts`. Never generic `index`/`store`/`create`/`update`/`destroy`. (ADR 0009, L11-L12)
4. **Layer boundaries are hard** — handlers → queries → services → core. Import direction enforced. Queries never import handlers. Validators never import services. (L14-L17)
5. **Two response types, never mixed** — page routes return `res.inertia()`, data routes return `jsonSuccess()`/`jsonError()`. (L3-L4)
6. **`api()` wrapper for all frontend HTTP** — never raw `fetch()`, never bare `axios`, never `router.post/put/patch/delete`. (L5-L7)
7. **Svelte 5 runes only** — `$state`, `$derived`, `$effect`, `$props`. Never `onMount`, `$:`, `export let`, or Svelte stores. (L8)
8. **Logger, not console** — `Logger.info/warn/error`. `console.log` only in bootstrap files where Logger isn't initialized. (L9)
9. **`hashPassword()` from Authenticate, never bcrypt direct** — the wrapper enforces the correct cost factor. (L10)
10. **Bahasa Indonesia for all user-facing messages** — error messages, toast, validation, page copy, labels, buttons. English for code, comments, logs, and internal error codes. (ADR 0010)
11. **AGENTS.md stays in sync with code** — every documented directory has an AGENTS.md, every Structure table matches the actual files. (check:agents, convention test)
12. **CODEMAP stays fresh** — regenerated after any source change. Stale CODEMAP blocks CI. (check:freshness)
13. **Files stay small** — source files under 500 lines. Split before they grow into monsters. (check:filesize)
14. **Docs links resolve** — no broken markdown links in AGENTS.md, skills, or ADRs. (check:links)
15. **No new `any`** — type safety is non-negotiable. Existing `any` is baselined; new `any` blocks CI. Use proper types. (check:types)

## Mental Model

```
Browser (Svelte 5 + Inertia)
  │  router.visit() for pages · axios for data
  ▼
Server (ultimate-express)
  │  Request → Middleware → Router → Handler → Response
  │
  ├── handlers/   (request handlers — functions)
  ├── queries/    (raw SQL functions)
  ├── services/   (SQLite, Auth, Logger, Storage, CacheStore)
  ├── middlewares/ (auth, csrf, rateLimit, securityHeaders)
  ├── validators/ (Zod schemas)
  ├── config/     (env + constants)
  └── types/      (interfaces)
```

### Two Response Types

| Route Type | Called By | Returns |
|---|---|---|
| **Page** | Browser navigation | `res.inertia('pageName', { data })` |
| **Data** | `axios` from Svelte | `jsonSuccess()`, `jsonError()`, `jsonCreated()` |

## Structure

```
./
├── app/
│   ├── types/           # Interfaces (User, Session, Role, Permission)
│   ├── queries/         # Raw SQL functions (findUserById, createUser, isAdmin)
│   ├── handlers/        # Request handlers (functions, not classes)
│   ├── services/        # SQLite, Logger, Auth, Storage, CacheStore, LoginThrottle
│   ├── middlewares/      # auth, csrf, rateLimit, securityHeaders, inputSanitize, requestId
│   ├── validators/      # Zod schemas + zodToErrors helper
│   ├── config/          # Environment (env.ts) & constants (constants.ts)
│   └── core/            # App, Router, errors, response helpers
├── routes/web.ts        # All route definitions
├── migrations/          # TypeScript migrations (raw SQL strings, up/down exports)
├── seeds/               # TypeScript seeds (run(SQLite) function exports)
├── resources/             # Frontend (Svelte 5 + Inertia)
│   ├── inertia.html       # HTML template (served by View.ts)
│   ├── app.ts             # Inertia app entry point
│   ├── index.css          # Global styles + Tailwind
│   ├── Pages/             # Route pages (.svelte)
│   ├── Components/        # Reusable components (Header, Button, Switch, Modal, etc — Zag JS for interactive UI)
│   ├── lib/               # api.ts, csrf.ts, toast.ts, utils.ts (cn), utils/
│   └── types/             # generated.ts + index.ts (manually synced with backend)
├── tests/               # Vitest tests
├── server.ts            # Entry point
└── database/            # SQLite database files (dev.sqlite3, production.sqlite3)
```

## Skills (load on demand)

| Skill | When to load |
|---|---|
| [`.agents/skills/crud-pattern.md`](./.agents/skills/crud-pattern.md) | Adding a new resource (full stack) |
| [`.agents/skills/sqlite-usage.md`](./.agents/skills/sqlite-usage.md) | Writing SQL queries, transactions |
| [`.agents/skills/auth-rbac.md`](./.agents/skills/auth-rbac.md) | Auth guards, permission checks |
| [`.agents/skills/inertia-patterns.md`](./.agents/skills/inertia-patterns.md) | Frontend pages, navigation, API calls |
| [`.agents/skills/api-contract.md`](./.agents/skills/api-contract.md) | Error responses, validation, API contract |
| [`.agents/skills/pentest-pattern.md`](./.agents/skills/pentest-pattern.md) | OWASP Top 10 security testing, POCs, finding format |
| [`.agents/skills/testing-pattern.md`](./.agents/skills/testing-pattern.md) | Handler/query/middleware/validator test patterns, mock helpers |

## Database Schema

| Table | Key Columns | Relations |
|---|---|---|
| `users` | id (uuid), username, name, password, phone, avatar, is_active | has many roles via `user_roles` |
| `sessions` | id (uuid), user_id, user_agent, expires_at | belongs to `users` |
| `roles` | id (uuid), name, slug, description | has many permissions via `role_permissions` |
| `permissions` | id (uuid), name, slug, resource, action, description | belongs to roles via `role_permissions` |
| `user_roles` | id (uuid), user_id, role_id, created_at | junction: `users` ↔ `roles` |
| `role_permissions` | id (uuid), role_id, permission_id, created_at | junction: `roles` ↔ `permissions` |
| `assets` | id (uuid), name, type, url, mime_type, size, s3_key, user_id | belongs to `users` |
| `academic_years` | id (uuid), name, start_at, end_at, is_active, is_grades_published | has many `classes` |
| `classes` | id (uuid), name, grade, academic_year_id | has many `students`, `schedules`, `class_subjects` |
| `subjects` | id (uuid), name, code, kkm | has many `teacher_subjects`, `class_subjects` |
| `students` | id (uuid), nis, name, class_id, parent_user_id, phone, address | belongs to `classes` and `users` (parent) |
| `teachers` | id (uuid), user_id, employee_id, phone | belongs to `users`; has many `teacher_subjects` |
| `parents` | id (uuid), user_id, phone, address | belongs to `users` |
| `teacher_subjects` | id (uuid), teacher_id, subject_id, academic_year_id | junction: `teachers` ↔ `subjects` |
|`class_subjects`|id (uuid), class_id, subject_id, teacher_id, academic_year_id|junction: `classes` ↔ `subjects`|
| `teacher_class_assignments` | id (uuid), teacher_id, class_id, academic_year_id, is_homeroom | junction: `teachers` ↔ `classes`, one homeroom per class/year |
|`grade_components`|id (uuid), academic_year_id, type, name, weight|belongs to `academic_years`|
|`grade_audit_logs`|id (uuid), grade_id, student_id, subject_id, class_id, type, action, old_score, new_score, user_id|append-only history of grade changes|
|`announcements`|id (uuid), title, body, author_user_id|belongs to `users`|
|`notifications`|id (uuid), user_id, type, title, body, read_at|belongs to `users`|
| `schedules` | id (uuid), class_id, subject_id, teacher_user_id, day_of_week, start_time, end_time, academic_year_id | belongs to `classes`, `subjects`, `users`, `academic_years` |
| `school_locations` | id (uuid), name, npsn (nullable), headmaster_name (nullable), phone (nullable), email (nullable), address, latitude (nullable), longitude (nullable), radius_meters (nullable), is_active | school profile; geofence enforced when lat/long/radius all set |
| `teacher_confirmations` | id (uuid), schedule_id (nullable), teacher_user_id, photo_url (nullable), latitude, longitude, distance_meters, is_inside_school, confirmation_date, confirmed_at | belongs to `schedules` (optional), `users`; one per teacher per day in QR flow |
| `app_settings` | key (text), value (text), updated_at | key-value store for app settings (qr_refresh_interval, etc) |
| `journals` | id (uuid), schedule_id, teacher_confirmation_id, date, material | belongs to `schedules`, `teacher_confirmations` |
| `student_attendance` | id (uuid), student_id, schedule_id, journal_id, status | belongs to `students`, `schedules`, `journals` |
| `grades` | id (uuid), student_id, subject_id, class_id, type, score, date, teacher_user_id | belongs to `students`, `subjects`, `classes`, `users` |

- All IDs: `crypto.randomUUID()` (except auto-increment tables)
- All timestamps: `biginteger` unix milliseconds via `Date.now()`
- Foreign keys: `.onDelete('CASCADE')`

## Demo Accounts (after `npm run seed`)

|Role|Username|Password|Notes|
|---|---|---|---|
|Admin|admin|admin123|full access, manage master data|
|Kepala Sekolah|kepala|kepala123|oversight dashboards, reports, audit|
|Guru (Matematika + Biologi)|budi|teacher123|mengajar 10A MAT, 10B BIO|
|Guru (Bahasa Inggris)|siti|teacher123|mengajar 10A & 10B ENG|
|Orang Tua|10001|parent123|10 anak (NIS 10001–10010), lihat nilai + absensi|

Demo data (`seeds/07_demo_data.ts`): 14 hari konfirmasi + jurnal guru (1 sesi sengaja tidak dikonfirmasi untuk demo alarm kepala sekolah, 1 konfirmasi di luar radius), nilai UAS untuk semua siswa, audit log, notifikasi parent, pengumuman, dan nilai terpublikasi.

## Middleware

| Middleware | Import | Effect |
|---|---|---|
| `Auth` | `@middlewares/auth` | Requires session, loads user + roles + permissions |
| `strictRateLimit()` | `@middlewares/rateLimit` | 10 req/min per IP |
| `csrf()` | `@middlewares/csrf` | Double Submit Cookie CSRF protection |
| `securityHeaders()` | `@middlewares/securityHeaders` | HSTS, CSP, X-Frame-Options |
| `inputSanitize()` | `@middlewares/inputSanitize` | XSS protection via DOMPurify |
| `requestId()` | `@middlewares/requestId` | Adds `req.requestId` for tracing |
| `requestLogger()` | `@middlewares/requestLogger` | Logs requests via Logger |

## Conventions

- **2-space indent** (.editorconfig)
- **Strict TypeScript** (strict: true)
- **Path aliases** — `@core`, `@queries`, `@services`, `@middlewares/*`, `@handlers/*`, `@types`, `@validators`, `@config`
- **Password hashing** — `hashPassword()` / `comparePassword()` from `@services/Authenticate`
- **Constants** — use `@config/constants` (SERVER, AUTH, RATE_LIMIT, UPLOAD, CACHE, LOGGING)
- **IDs** — `crypto.randomUUID()` for all new records

## Dependency Policy

See [`.agents/skills/dependency-policy.md`](./.agents/skills/dependency-policy.md) — 16-category table of allowed vs banned dependencies. Check before suggesting a new dependency.

## Common Pitfalls

See [`.agents/skills/common-pitfalls.md`](./.agents/skills/common-pitfalls.md) — 10 real mistakes AI agents make in this codebase. Read before coding.

## Anti-Patterns

1. **Don't** use classes — use functions
2. **Don't** use ORM/query builder — write raw SQL in `queries/`
3. **Don't** return `jsonSuccess` from a page route — use `res.inertia()`
4. **Don't** return `inertia()` from a data route — use `jsonSuccess/jsonError`
5. **Don't** use relative imports for core modules — use path aliases
6. **Don't** use `console.log` — use `Logger.info/warn/error`
7. **Don't** use `fetch()` on frontend — use `api(() => axios.method(...))`
8. **Don't** use bcrypt directly — use `hashPassword()` from `@services/Authenticate`
9. **Don't** mix languages in user-facing messages — use Bahasa Indonesia for toast, validation, API error `message`, and page copy. Code, comments, logs, and internal error codes stay English (see ADR 0010)
10. **Don't** use generic handler names (`index`, `store`, `create`, `update`, `destroy`) — use descriptive names (`createUser`, `updateRole`, `listRoles`)
11. **Don't** use vague function names (`handle`, `process`, `run`, `do`, `execute` as standalone) — describe what it does (`processPayment`, `handleWebhookDelivery`)

## Build/Test

```bash
npm run dev          # Dev server (Vite + nodemon)
npm run build        # Production build
npm run lint         # tsc --noEmit
npm run test         # vitest run (ALL tests — for CI/pre-commit only)
npm run migrate      # Run pending migrations (ts-node + raw SQL)
npm run seed         # Run seeders
```

### Smart test running (during development)

**Don't run `npm test` on every change.** It runs the full suite (200+ tests) — burns your token budget parsing irrelevant results (TDAD study: this increases regressions by 63%).

Instead, run **only the test file for the layer you touched**:

```bash
# Touched handlers/roles.ts?
npx vitest run tests/handlers/roles.test.ts

# Touched queries/users.ts?
npx vitest run tests/queries/roles.test.ts

# Touched core/response.ts?
npx vitest run tests/core/

# Touched a middleware?
npx vitest run tests/middlewares/

# Before commit — THEN run the full suite
npm run check
```

Rule: **specific test file during development, full suite before commit.**

## Agent Tooling

SIGAP ships with agent-ergonomic tooling. Run these before committing AI-generated code.

| Command | Purpose | Blocks commit? |
|---|---|---|
| `npm run check` | All-in-one: lint + typecheck + lint:layers + freshness + AGENTS accuracy + security + links + file size + type safety + tests | No (run manually) |
| `npm run codemap` | Regenerate `CODEMAP.md` (codebase topology index) | No |
| `npm run gen:resource <name> -- --fields="..."` | Scaffold a full-stack resource (11 files incl. test stub) | No |
| `npm run lint:layers` | Enforce 17 layer boundary + naming + import direction rules | Yes (pre-commit) |
| `npm run check:types` | Block new `any`/`as any`/`@ts-ignore` beyond baseline. Update: `--update` flag. | Yes (CI) |
| `npm run eval` | End-to-end eval: generate resource → verify conventions → run gates → cleanup (39 checks). Runs in CI. | Yes (CI) |

### CODEMAP.md

Auto-generated index of files, exports, and import graph. Read this BEFORE searching the codebase — it gives topology in one read (~750 tokens). Regenerate after large changes:

```bash
npm run codemap
```

### Resource Generator

Scaffold a full-stack resource (types → migration → queries → validator → handler → route → page → test stub) following all conventions:

```bash
npm run gen:resource products -- --fields="name:string,price:number"
```

Generates 11 files with correct naming (ADR 0009), raw SQL (ADR 0001), functions (ADR 0002), descriptive handler names, and a test stub with pre-wired mocks. Zero structural mistakes possible.

### Layer Boundary Lint

Enforces 17 rules from AGENTS.md anti-patterns + import direction:
- L1-L10: anti-patterns (no SQLite in handlers, no fetch in frontend, no console.log, etc.)
- L11-L13: naming conventions (no generic names, include resource, no vague functions)
- L14-L17: import direction (queries → types only, services → core only, validators → types+zod only, middlewares → core+queries only)

See `scripts/lint-layers.ts` for the full rule list.

### Pre-commit Hook

Install with:
```bash
cp scripts/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
```

Runs layer lint (blocking) on every commit.

## Where to Look

| Task | Location | Skill |
|---|---|---|
| Add new endpoint | `app/handlers/` + `routes/web.ts` | [`crud-pattern.md`](./.agents/skills/crud-pattern.md) |
| Add database query | `app/queries/` | [`sqlite-usage.md`](./.agents/skills/sqlite-usage.md) |
| Add data model | `app/types/models.ts` + `migrations/` | [`crud-pattern.md`](./.agents/skills/crud-pattern.md) |
| Add Zod schema | `app/validators/schemas.ts` + export from `index.ts` | [`api-contract.md`](./.agents/skills/api-contract.md) |
| Auth logic | `app/services/Authenticate.ts` | [`auth-rbac.md`](./.agents/skills/auth-rbac.md) |
| Permission checks | `app/queries/users.ts` (isAdmin, hasPermission) | [`auth-rbac.md`](./.agents/skills/auth-rbac.md) |
| File upload | `app/handlers/assets.ts` (multer + sharp + Storage) | — |
| Frontend page | `resources/Pages/` | [`inertia-patterns.md`](./.agents/skills/inertia-patterns.md) |
| Frontend component | `resources/Components/` | — |
| Constants | `app/config/constants.ts` | — |
| Adapters | `app/core/adapters/` (Svelte/Inertia integration) | — |
