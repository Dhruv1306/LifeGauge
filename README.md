# LifeGauge ⏱️📊

> **An AI-Assisted Personal Productivity and Life Analytics Platform**

LifeGauge brings tasks, priorities, deadlines, focus/time sessions, and selected habits into one centralized system, converts recorded activity into transparent productivity metrics and visual trends, and uses AI selectively to interpret those analytics into concise, personalized observations and recommendations.

---

## Key Features

1. **Deterministic Analytics First**: The application is the source of truth for all calculations. Metrics are transparent, traceable, and never hallucinated.
2. **Habit Punchcard Matrix**: LeetCode and GitHub-style visual habit grid (dates on X-axis, habits on Y-axis, Green for completed, Orange for missed, Gray for rest days).
3. **Stock-Style Momentum Chart**: Trajectory area/line chart showing day-over-day productivity momentum with horizontal baseline references.
4. **Time Blocking**: Retrospective Google Calendar style time-block logging with category distributions.
5. **AI Retrospectives**: Automatic **Weekly Reviews** and **Monthly Rewind** (Spotify Wrapped style) powered by pre-computed structured factsheets and multi-layer guardrails.
6. **Robust Security & Privacy**: Form-based authentication with bcrypt password hashing, Bearer JWT in client `localStorage` with route guards, and strict database tenant isolation (`userId` scoped).

---

## Monorepo Architecture

* `frontend/`: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Recharts (deployable to Vercel).
* `backend/`: Node.js, Express, TypeScript, Prisma ORM, MySQL (deployable to Render).
* `docs/`: Source of truth specifications, architectural diagrams, and metric formulas.

---

## Quick Start (Development)

### Prerequisites
* Node.js (v20+ LTS recommended)
* MySQL database (local or hosted e.g. Aiven)

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/LifeGauge.git
cd LifeGauge

# Install all workspace dependencies
npm install

# Setup environment variables
cp backend/.env.example backend/.env

# Run database migrations
npm run db:migrate --workspace=backend

# Start backend & frontend concurrently
npm run dev
```

---

## License
MIT
