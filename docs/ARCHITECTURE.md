# LifeGauge: System Architecture

## 1. High-Level Architecture

LifeGauge employs a strict 3-tier, 3-layer architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Client)                         │
│  - React 18 + Vite + TypeScript                             │
│  - Tailwind CSS + Lucide React                              │
│  - Recharts: Habit Punchcard Matrix & Stock Momentum Chart  │
│  - Client authStorage (localStorage with Route Guard)       │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS (Bearer JWT Token)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Backend API Server (Render)                   │
│  - Node.js + Express + TypeScript                           │
│  - Layer 1: Data Access & Tenant Isolation (userId scoped)  │
│  - Layer 2: Deterministic Analytics & Normalization Engine  │
│  - Layer 3: Mock AI Retrospective Service & Zod Validation  │
│  - Scheduler: node-cron (local) + /api/jobs (cloud webhook) │
└──────────────────────────────┬──────────────────────────────┘
                               │ TCP / SSL Connection
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Hosted MySQL Database (Aiven)                   │
│  - Managed via forward-only Prisma migrations               │
│  - Non-destructive evolution                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. The 3 Conceptual Layers

### Layer 1: Raw Records (Source of Truth)
The fundamental transactional state created by the user:
* `User`: Credentials, profile, score weights
* `Task`: Title, priority, due date, status
* `Habit`: Recurring schedule definition
* `HabitLog`: Date-specific completion flag
* `TimeEntry`: Time block with category and duration

### Layer 2: Deterministic Analytics Engine
Application-level pure functions that convert raw logs into structured mathematical metrics:
* Aggregates completion percentages, streaks, focus minutes, and distributions.
* Applies dynamic weight normalization and Rest Day exclusion rules.
* Computes day-over-day and week-over-week deltas for the Stock Momentum chart.
* Produces immutable, serializable JSON factsheets.

### Layer 3: AI Interpretation Layer
Consumes Layer 2 JSON factsheets to produce human-readable observations and recommendations:
* In Phase 1, powered by a deterministic Mock AI Provider matching the Zod schema.
* Enforces post-generation validation to ensure no unsupported numbers or categories are produced.
* Results are persisted in `WeeklyReview` and `MonthlyRewind` records.

---

## 3. Deployment Topology
* **Frontend**: React + Vite SPA hosted on **Vercel** (`https://lifegauge.vercel.app`).
* **Backend**: Express API server hosted on **Render** (`https://lifegauge-api.onrender.com`).
* **Database**: Managed MySQL service (e.g., **Aiven**).
* **Communication**: Browser communicates strictly with the backend API over HTTPS; never accesses MySQL directly.
* **CORS**: Configured on Express to permit requests from the Vercel domain with Bearer token authorization.
