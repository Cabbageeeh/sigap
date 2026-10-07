# SIGAP — Sistem Informasi Guru, Absensi, dan Prestasi

[![CI](https://github.com/MasRama/sigap/actions/workflows/ci.yml/badge.svg)](https://github.com/MasRama/sigap/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> Trust-first school management — verify attendance with camera and geolocation.

SIGAP (Sistem Informasi Guru, Absensi, dan Prestasi) membantu sekolah mengelola tahun ajaran, kelas, siswa, guru, jadwal, jurnal, nilai, dan akses orang tua. Alur konfirmasi anti-kecurangan mengharuskan guru mengambil swafoto dan membagikan lokasi sebelum mengajar, sehingga setiap jurnal terikat pada orang nyata di tempat nyata.

Built on the Nara AI-first TypeScript starter: functions over classes, raw SQL over ORM, Svelte 5 + Inertia.js, and SQLite.

---

## What it does

| Module | What |
|---|---|
| **Master data** | Academic years, classes, subjects, students, teachers, parents, schedules, school locations. |
| **Teacher flow** | Daily schedule, selfie + geolocation confirmation, digital journal, and grades. |
| **Anti-fraud** | Haversine distance check against the active school location; photos saved locally and auditable. |
| **Parent portal** | View their children's attendance and grades. |
| **Headmaster view** | Dashboard summary and report of confirmations made outside the school radius. |

---

## Quick start

```bash
git clone https://github.com/MasRama/sigap.git && cd sigap
npm install
cp .env.example .env
npm run migrate:fresh
npm run dev
```

Open [http://localhost:5555](http://localhost:5555).

### Default account

Seed creates only permissions, roles, and the admin account: **admin / admin123**. Demo students, teachers, classes, grades, and school data are not seeded.

Running npm run seed does not delete existing data. To empty an existing database and recreate only the admin account, stop the application first and run:

```bash
npm run data:reset -- --confirm
```

This deletes all existing accounts and school data after creating a SQLite backup under the database backups directory. Change the admin password after logging in. Restart the application when finished.

---

## Tech stack

| Area | Stack |
|---|---|
| Server | ultimate-express (uWebSockets.js) |
| Frontend | Svelte 5, Inertia.js, Tailwind CSS 4, Zag JS |
| Database | SQLite via better-sqlite3, raw SQL migrations |
| Auth | Session-based + RBAC |
| Validation | Zod |
| Security | CSRF, rate limiting, XSS sanitization, security headers, login throttling |
| Storage | Local file storage for confirmation photos |

---

## Project structure

```
./
├── app/
│   ├── handlers/    # Request handlers (functions)
│   ├── queries/     # Raw SQL functions
│   ├── services/    # SQLite, Auth, Logger, Storage, Geolocation, CameraUpload
│   ├── middlewares/ # auth, csrf, rateLimit, securityHeaders
│   ├── validators/  # Zod schemas
│   └── core/        # App, Router, errors, response helpers
├── routes/web.ts    # All routes
├── migrations/      # Raw SQL migrations
├── seeds/           # Seed files
├── resources/       # Svelte 5 + Inertia frontend
│   ├── Pages/       # Route pages
│   ├── Components/  # Reusable UI components
│   └── lib/         # api.ts, toast.ts, utils.ts
├── tests/           # Vitest tests
└── docs/decisions/  # ADRs
```

---

## Verification

```bash
npm run check      # lint + typecheck + layer lint + all gate checks + tests
npm run lint:layers # 17 layer boundary and naming rules
npm run test       # 266+ tests
```

---

## Read

| File | Purpose |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | Conventions, anti-patterns, structure |
| [`CODEMAP.md`](./CODEMAP.md) | Auto-generated codebase index |
| [`routes/web.ts`](./routes/web.ts) | All routes in one file |
| [`docs/decisions/`](./docs/decisions/README.md) | Architecture decision records |

---

## Requirements

Node.js >= 20 · npm · SQLite is embedded.

## License

[MIT](./LICENSE) — Built by [MasRama](https://github.com/MasRama)
