# Understanding of LifeGauge Folder Structure

This document describes the repository as it exists on 2026-10-05.

## Current Status

LifeGauge is now a two-workspace monorepo with a working backend API and a working React frontend foundation.

Implemented in source code:

- React/Vite frontend with login/register, protected routing, dashboard, tasks, habits, and time pages.
- Express/TypeScript backend with authentication, task CRUD, habit tracking, time-entry tracking, and analytics endpoints.
- Prisma/MySQL schema for users, tasks, habits, habit logs, time entries, weekly reviews, and monthly rewinds.
- bcrypt password hashing and JWT Bearer authentication.
- User-scoped database queries for tenant isolation.
- Deterministic daily metrics, dynamic weight normalization, rest-day handling, and momentum analytics.
- Vitest security tests.
- Compiled backend JavaScript in `backend/dist` and a Vite production bundle in `frontend/dist`.

Not yet implemented in source code:

- Weekly/monthly AI review generation and persistence services.
- Background job routes and active `node-cron` scheduling.
- Production deployment configuration.
- A GitHub remote connection.

## Complete Folder Tree

```text
LifeGauge/
|-- .git/                              Local Git history and branch data
|-- .gitignore                         Ignored secrets, dependencies, and build output
|-- package.json                       Root npm workspace scripts
|-- package-lock.json                  Locked dependency versions
|-- README.md                          High-level project overview
|-- Understanding of folder structure_first.md
|                                      This guide
|-- docs/                              Product and architecture documentation
|   |-- AI_INSIGHTS.md
|   |-- ARCHITECTURE.md
|   |-- METRICS.md
|   |-- PROJECT_SPEC.md
|   `-- ROADMAP.md
|-- backend/                           Express API workspace
|   |-- .env                           Local environment values, ignored by Git
|   |-- .env.example                    Shareable environment template
|   |-- package.json                    Backend scripts and dependencies
|   |-- tsconfig.json                   TypeScript compiler configuration
|   |-- prisma/
|   |   `-- schema.prisma               MySQL data model and relations
|   |-- src/                            Editable TypeScript source
|   |   |-- index.ts                    Express app bootstrap and server startup
|   |   |-- config/index.ts             Environment-backed configuration
|   |   |-- controllers/                Request validation and business operations
|   |   |   |-- authController.ts
|   |   |   |-- analyticsController.ts
|   |   |   |-- habitController.ts
|   |   |   |-- taskController.ts
|   |   |   `-- timeEntryController.ts
|   |   |-- lib/prisma.ts               Shared Prisma client
|   |   |-- middleware/
|   |   |   |-- auth.ts                  JWT and cron-secret guards
|   |   |   `-- errorHandler.ts          Global error response formatter
|   |   |-- routes/                     URL-to-controller mapping
|   |   |   |-- index.ts
|   |   |   |-- analyticsRoutes.ts
|   |   |   |-- authRoutes.ts
|   |   |   |-- habitRoutes.ts
|   |   |   |-- taskRoutes.ts
|   |   |   |-- timeEntryRoutes.ts
|   |   |   `-- userRoutes.ts
|   |   |-- services/analytics/
|   |   |   `-- analyticsService.ts     Pure scoring and momentum calculations
|   |   `-- types/index.ts               Shared Express/JWT TypeScript types
|   |-- dist/                           Generated JavaScript output; do not edit manually
|   |   |-- index.js                    Compiled equivalent of src/index.ts
|   |   |-- config/, controllers/, lib/, middleware/, routes/, services/, types/
|   |   `-- ...                          Compiled .js files matching src modules
|   |-- tests/auth.test.ts               Vitest security tests
|   `-- node_modules/                   Installed backend/workspace packages
|-- frontend/                           React/Vite workspace
|   |-- index.html                      Browser HTML entry point
|   |-- package.json                    Frontend scripts and dependencies
|   |-- vite.config.ts                  Port 5173 and /api proxy to port 5000
|   |-- tsconfig*.json                  Frontend TypeScript configuration
|   |-- tailwind.config.js              Tailwind configuration
|   |-- postcss.config.js               CSS processing configuration
|   |-- src/
|   |   |-- main.tsx                    React entry point
|   |   |-- App.tsx                     Browser routes and protected pages
|   |   |-- index.css                   Global styling
|   |   |-- api/client.ts                Axios client and JWT interceptor
|   |   |-- context/AuthContext.tsx      Login state and session restoration
|   |   |-- utils/authStorage.ts         localStorage token/user storage
|   |   |-- pages/                      Login, dashboard, tasks, habits, and time screens
|   |   |-- components/common/           Navbar, route guard, settings modal
|   |   |-- components/tasks/            Task list and create modal
|   |   |-- components/habits/           Habit create modal
|   |   |-- components/dashboard/        Time logger and score gauges
|   |   `-- components/charts/           Habit matrix, momentum, and time distribution
|   `-- dist/                           Generated Vite production assets
`-- node_modules/                       Root workspace dependency installation
```

## `src` Versus `dist`

`backend/src` contains the source developers edit. It is written in TypeScript (`.ts`).

`backend/dist` contains the JavaScript produced by the TypeScript compiler. It is created by:

```powershell
npm.cmd run build:backend
```

For example:

```text
backend/src/routes/taskRoutes.ts  ->  backend/dist/routes/taskRoutes.js
backend/src/index.ts               ->  backend/dist/index.js
backend/src/services/analytics/analyticsService.ts
                                   -> backend/dist/services/analytics/analyticsService.js
```

They are not different features. They are two representations of the same backend: TypeScript source for development and JavaScript output for running the compiled production-style server. Do not edit `dist`; change `src`, then build again. `backend/package.json` runs `dist/index.js` only for the `start` script.

The same idea applies to `frontend/src` and `frontend/dist`: Vite turns the React/TypeScript source into browser assets for preview or deployment.

## How the Application Connects

```text
Browser :5173
  |-- React route /login, /, /tasks, /habits, /time
  |-- Axios client adds Authorization: Bearer <JWT>
  `-- Vite proxies /api/*
          |
          v
Express API :5000
  |-- /api/health
  |-- /api/auth/* and /api/user/*
  |-- /api/tasks/*, /api/habits/*, /api/time-entries/*
  `-- /api/analytics/*
          |
          v
JWT middleware -> controller -> Prisma client -> MySQL
                              |
                              `-> analyticsService for deterministic scores
```

The frontend stores the JWT in local storage. The Axios interceptor sends it with each API request. Protected backend routes verify it and use the embedded user ID to restrict database reads and writes to that user.

## Currently Implemented API Endpoints

The backend base URL is `http://localhost:5000`. There are 26 route declarations.

### Health

- `GET /api/health` - public server health check.

### Authentication

- `POST /api/auth/register` - create a user and return a JWT.
- `POST /api/auth/login` - validate credentials and return a JWT.
- `GET /api/auth/me` - return the authenticated user; requires Bearer JWT.
- `PUT /api/auth/weights` - update score weights; requires Bearer JWT.

### User

- `GET /api/user/profile` - same profile operation as `/api/auth/me`; requires Bearer JWT.
- `PUT /api/user/weights` - same weight operation as `/api/auth/weights`; requires Bearer JWT.

### Tasks

- `GET /api/tasks` - list the authenticated user's tasks; supports `status`, `priority`, `dueDate`, and `search` query parameters.
- `POST /api/tasks` - create a task.
- `GET /api/tasks/:id` - retrieve one task.
- `PATCH /api/tasks/:id` - update task fields or completion state.
- `DELETE /api/tasks/:id` - delete a task.

### Habits

- `GET /api/habits` - list active habits.
- `POST /api/habits` - create a habit.
- `GET /api/habits/matrix` - return the habit punchcard matrix; supports `startDate` and `endDate`.
- `PATCH /api/habits/:id` - update a habit.
- `DELETE /api/habits/:id` - delete a habit and its logs.
- `POST /api/habits/:id/toggle` - toggle a habit log for a `YYYY-MM-DD` date.

### Time Entries

- `GET /api/time-entries` - list time entries; supports date, category, and task filters.
- `POST /api/time-entries` - record a focus/time block.
- `GET /api/time-entries/summary` - return category totals and percentages.
- `PATCH /api/time-entries/:id` - update a time entry.
- `DELETE /api/time-entries/:id` - delete a time entry.

### Analytics

- `GET /api/analytics/daily` - calculate one day's scores and day-over-day delta; optional `date` query parameter.
- `GET /api/analytics/momentum` - return a score time series; optional `days` query parameter from 7 to 90.
- `GET /api/analytics/comparison` - compare periods; optional `period=day|week|month`.

All endpoints except health, registration, and login require `Authorization: Bearer <JWT>`. GET health can be typed directly into a browser. POST, PUT, PATCH, DELETE, and protected GET endpoints are normally exercised through the frontend, Postman, curl, or PowerShell because a browser address bar cannot add JSON bodies or Authorization headers.

## How to Run the Current Project

Use `npm.cmd` in PowerShell if the `npm.ps1` execution-policy error still occurs.

### Development mode

Open two terminals from the repository root:

```powershell
cd path\to\LifeGauge
npm.cmd run dev:backend
```

```powershell
cd path\to\LifeGauge
npm.cmd run dev:frontend
```

Then open:

```text
http://localhost:5173
```

The frontend Vite server proxies API calls to `http://localhost:5000`. `npm.cmd run dev` currently starts only the backend because the root script points to the backend workspace. It does not start both servers concurrently.

### Build mode

`build` checks/compiles the workspaces; it is not the normal development command:

```powershell
npm.cmd run build
```

To run the compiled backend after building:

```powershell
npm.cmd run start --workspace=backend
```

To preview the compiled frontend:

```powershell
npm.cmd run preview --workspace=frontend
```

## Current Runtime Check

With both development servers running:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5000/api/health`

The frontend login/register screen calls the auth API. After login, the dashboard calls daily analytics and task endpoints, the habit matrix calls habit endpoints, and the time distribution calls time-entry endpoints. Database-backed endpoints need a reachable MySQL database and a valid `backend/.env` `DATABASE_URL`.

## Git Status Note

The project has local Git commits, but a GitHub remote must still be configured separately. Use `git remote -v` to check it. This documentation does not assume that a remote exists.
