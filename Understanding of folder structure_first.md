# Understanding of LifeGauge Folder Structure

This document describes the state of LifeGauge as it exists in the repository on 2026-10-05 at 11:40 am.

## 1. Current Milestone

LifeGauge is currently a backend foundation and architecture phase project. The repository is a Node.js monorepo, but only the backend and documentation workspaces exist in the current tree.

Implemented in the current code:

- Root npm workspace configuration.
- Express and TypeScript backend API.
- Prisma schema for MySQL.
- User, task, habit, habit-log, time-entry, weekly-review, and monthly-rewind data models.
- Registration and login using email/password authentication.
- bcrypt password hashing.
- JWT Bearer-token authentication middleware.
- Protected profile and productivity-weight endpoints.
- CORS, JSON parsing, centralized error handling, and a health endpoint.
- Unit tests for bcrypt, JWT, authentication middleware, and cron-secret middleware.
- Architecture, product specification, metric formulas, AI guardrails, and roadmap documentation.

Not implemented yet in source code:

- The `frontend/` directory and React dashboard.
- Task, habit, habit-log, and time-entry CRUD routes/controllers.
- The deterministic analytics engine.
- Weekly/monthly review generation and persistence services.
- Scheduler routes under `/api/jobs` and the `node-cron` integration.
- Production deployment configuration.

The roadmap still shows Milestone 1 as unchecked, although the current commit and source code contain most of the Milestone 1 foundation. That checklist should be updated when the milestone is formally accepted.

## 2. Top-Level Structure

```text
LifeGauge/
|-- .git/                         Local Git repository data
|-- .gitignore                    Files excluded from Git
|-- package.json                  Root workspace scripts
|-- package-lock.json             Locked npm dependency tree
|-- node_modules/                 Installed root/workspace packages
|-- README.md                     Short project overview and quick start
|-- Understanding of folder structure.md
|                                 This detailed guide
|-- backend/                      Current executable API workspace
|   |-- package.json
|   |-- tsconfig.json
|   |-- .env.example
|   |-- prisma/
|   |-- src/
|   `-- tests/
`-- docs/                         Product and architecture source material
```

There is currently no `frontend/` directory, even though the root workspace configuration and documentation already reserve a workspace for it. Consequently, frontend scripts cannot work until that workspace is created.

## 3. Root Files

### `package.json`

Defines the private `lifegauge-monorepo` and declares `backend` and `frontend` as npm workspaces. It forwards common commands to workspaces:

- `npm run dev`: starts the backend development server.
- `npm run dev:backend`: explicitly starts the backend.
- `npm run dev:frontend`: expects a future frontend workspace.
- `npm run build:backend`: compiles the backend.
- `npm run build:frontend`: expects a future frontend workspace.
- `npm run build`: builds backend and frontend in sequence.
- `npm run test:backend`: runs backend tests.
- `npm test`: currently aliases the backend tests.

### `package-lock.json`

Locks the exact dependency versions installed by npm. It makes local, CI, and deployment installs more reproducible.

### `.gitignore`

Prevents dependencies, environment secrets, build output, local database files, editor files, and logs from being committed. In particular, `.env` is ignored while `.env.example` remains shareable.

### `README.md`

Provides the high-level product description, intended technology stack, and quick-start outline. Its migration example should use `npm run prisma:migrate --workspace=backend`; there is no `db:migrate` script in the current package files.

## 4. Backend Workspace

### `backend/package.json`

Defines the backend runtime and scripts:

- `dev`: runs `src/index.ts` through `ts-node-dev --respawn --transpile-only`.
- `build`: compiles TypeScript into `backend/dist`.
- `start`: runs the compiled `dist/index.js`.
- `test`: runs Vitest once.
- `prisma:generate`: generates the Prisma client.
- `prisma:migrate`: creates/applies a development migration.
- `prisma:deploy`: applies existing migrations in deployment environments.

Important dependency groups are Express/CORS for HTTP, Prisma for data access, bcryptjs for password hashing, jsonwebtoken for sessions, Zod for validation, dotenv for environment configuration, and Vitest for tests.

### `backend/tsconfig.json`

Compiles strict TypeScript targeting ES2022/CommonJS. Source comes from `backend/src`, compiled output goes to `backend/dist`, and tests are excluded from the production compilation.

### `backend/.env.example`

Documents the required environment values:

- `PORT`: API port, default `5000`.
- `NODE_ENV`: runtime mode.
- `JWT_SECRET`: signing secret for login tokens.
- `CRON_SECRET`: secret for future scheduled-job webhooks.
- `DATABASE_URL`: MySQL connection string.
- `CORS_ORIGIN`: expected browser origin, normally `http://localhost:5173`.

Copy this file to `backend/.env` and replace development/default secrets before using a shared or production database. The real `.env` is intentionally ignored by Git.

## 5. Backend Source Files

### `backend/src/index.ts`

Creates the Express application. It configures CORS, JSON request parsing, mounts all routes under `/api`, installs the global error handler, and starts listening on the configured port unless `NODE_ENV=test`. It exports the app so tests can import it without starting a server.

Connection flow:

```text
Client -> src/index.ts -> /api routes -> controller -> Prisma -> MySQL
                                      |
                                      `-> errorHandler for uncaught errors
```

### `backend/src/config/index.ts`

Loads `.env` through dotenv and exposes typed application configuration such as the port, JWT secret, CORS origin, cron secret, and database URL. Other backend files import `config` instead of reading environment variables repeatedly.

### `backend/src/routes/index.ts`

The top-level API router. It defines `GET /api/health` and mounts the authentication router at `/api/auth`.

### `backend/src/routes/authRoutes.ts`

Maps HTTP endpoints to authentication controllers:

- `POST /api/auth/register` -> create an account.
- `POST /api/auth/login` -> verify credentials and issue a JWT.
- `GET /api/auth/me` -> return the authenticated user.
- `PUT /api/auth/weights` -> update the user's metric weights and focus target.

The last two routes pass through `requireAuth` first.

### `backend/src/controllers/authController.ts`

Contains the authentication business logic. Zod validates request bodies, Prisma reads/writes users, bcrypt hashes or verifies passwords, and JWT signs seven-day Bearer tokens. New users receive default weights of 40% tasks, 35% focus, 25% habits, and a 120-minute daily focus target.

### `backend/src/middleware/auth.ts`

Provides reusable request guards:

- `requireAuth` reads `Authorization: Bearer <token>`, verifies the JWT, and attaches `id` and `email` to `req.user`.
- `requireCronSecret` checks `X-Cron-Secret` for future scheduled-job endpoints.

### `backend/src/middleware/errorHandler.ts`

Acts as the final Express error boundary. It formats Zod validation errors as HTTP 400 responses and returns HTTP 500 for unexpected errors.

### `backend/src/lib/prisma.ts`

Creates and exports one Prisma client. In non-production development it stores the client on `globalThis` to avoid creating extra database connections during reloads.

### `backend/src/types/index.ts`

Defines the TypeScript contracts shared by middleware and controllers. `AuthUserPayload` describes the JWT identity, and `AuthenticatedRequest` extends Express's request with an optional `user` property.

## 6. Database Layer

### `backend/prisma/schema.prisma`

Declares MySQL as the database provider and generates the Prisma client. The relationships are user-centered:

```text
User
|-- Tasks -------------------- optional TimeEntries
|-- Habits ------------------- HabitLogs
|-- TimeEntries
|-- WeeklyReviews
`-- MonthlyRewinds
```

Every user-owned record carries a relationship back to `User`, with cascade deletion where appropriate. This is the foundation for tenant isolation: future queries must always scope records by the authenticated `userId`.

The schema already models the planned product even though most corresponding API modules are not implemented yet. `Priority` supports LOW, MEDIUM, and HIGH task values. Unique constraints prevent duplicate habit logs for one habit/date and duplicate weekly or monthly reviews for one user and period.

No Prisma migration directory is currently visible in the project tree, so a database migration must be created/applied before the API can persist users against a fresh MySQL database.

## 7. Tests

### `backend/tests/auth.test.ts`

Contains unit tests for Milestone 1 security behavior: bcrypt hashing, JWT signing/verification and tamper rejection, missing/invalid/valid Bearer tokens, and missing/wrong/valid cron secrets. These tests exercise middleware and libraries without testing the full database-backed registration flow.

## 8. Documentation Folder

- `docs/PROJECT_SPEC.md`: product goals, modules, scoring rules, and intended technology stack.
- `docs/ARCHITECTURE.md`: three-tier deployment architecture and three conceptual layers: raw records, deterministic analytics, and AI interpretation.
- `docs/METRICS.md`: formulas for task, focus, habit, weighted score, rest-day handling, and momentum.
- `docs/AI_INSIGHTS.md`: factsheet input, Zod output shape, hallucination guardrails, and the planned offline mock AI provider.
- `docs/ROADMAP.md`: phase and milestone checklist. It currently describes the target roadmap rather than a complete implementation inventory.

These documents describe planned behavior and should not be treated as proof that every described module already exists in `backend/src`.

## 9. How the Pieces Connect

1. A client sends an HTTP request to the Express app in `src/index.ts`.
2. `/api` forwards the request to the router in `src/routes/index.ts`.
3. Authentication requests continue through `authRoutes.ts` to a controller.
4. Protected requests first pass through `requireAuth`, which obtains the user identity from the JWT.
5. The controller validates input with Zod and uses the shared Prisma client to access MySQL.
6. The response returns JSON to the client; unexpected errors pass to `errorHandler`.
7. The future frontend will call this API and display tasks, habits, time entries, deterministic metrics, and AI retrospectives.

## 10. How to Run It

### Prerequisites

- Node.js 20 or newer.
- npm.
- A running MySQL database and a valid connection string.

### First-time setup in PowerShell

```powershell
cd C:\Users\dhruv\OneDrive\Desktop\LifeGauge
npm install
Copy-Item backend\.env.example backend\.env
# Edit backend\.env and set DATABASE_URL and strong secrets.
npm run prisma:generate --workspace=backend
npm run prisma:migrate --workspace=backend
```

The migration command may ask for a migration name. Use a name such as `initial_schema`.

### Start development mode

```powershell
npm run dev
```

The API should be available at `http://localhost:5000`. A quick check is:

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

### Build and run compiled backend

```powershell
npm run build:backend
npm run start --workspace=backend
```

### Run tests

```powershell
npm run test:backend
```

### Current frontend limitation

`npm run dev:frontend` and the combined frontend build do not work yet because `frontend/` is not present. The current root `npm run dev` starts only the backend.

## 11. Nodemon and Automatic Updates

Nodemon is not installed and there is no nodemon configuration. The backend uses `ts-node-dev` instead:

```text
ts-node-dev --respawn --transpile-only src/index.ts
```

`--respawn` restarts the backend process when TypeScript files change. This is automatic server restart, not browser hot reload. Browser updates will require a frontend dev server such as Vite once the `frontend/` workspace is created. For the current backend-only project, use an API client, curl, or Postman to check responses.

## 12. Git and GitHub Status

The project is initialized as a local Git repository: `.git/` exists, the current branch is `master`, and the current commit is:

```text
f2f2285 feat(backend): complete Milestone 1 with Prisma schema, auth, security middlewares, and tests
```

The working tree currently has a modification to `docs/ROADMAP.md`. No output was returned by `git remote -v`, so this checkout does not currently have a remote GitHub repository configured. Git initialization and GitHub connection are separate steps:

```powershell
git remote add origin https://github.com/<your-username>/<your-repository>.git
git push -u origin master
```

Only run those commands with the real repository URL. Afterward, verify the connection with:

```powershell
git remote -v
git branch -vv
```
