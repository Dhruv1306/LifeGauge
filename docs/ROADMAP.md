# LifeGauge: Development & Release Roadmap

## Phase 0: Architecture & Source of Truth (Current)

* [X] Project Specification (`docs/PROJECT_SPEC.md`)
* [X] System Architecture (`docs/ARCHITECTURE.md`)
* [X] Metrics & Scoring Formulas (`docs/METRICS.md`)
* [X] AI Insights & Guardrails (`docs/AI_INSIGHTS.md`)
* [X] Monorepo Workspace Configuration

## Phase 1: Core Foundation & Tracking Modules

* [X] **Milestone 1**: Database Schema, Non-Destructive Migrations, and Form-Based Bearer Auth with Tenant Isolation.
* [X] **Milestone 2**: Core Data Modules (Tasks CRUD with Priorities, Habit Definitions & Punchcard Matrix, Google Calendar style Time Entries).
* [ ] **Milestone 3**: Deterministic Analytics Engine, Dynamic Weight Normalization, Rest Day vs. Zero Output logic, Vitest Suite.

## Phase 2: User Interface & Visualizations

* [ ] **Milestone 4**: React 18 + Vite + Tailwind Dashboard, LeetCode/GitHub Habit Matrix, Recharts Stock Momentum Trajectory, Route Guards.
* [ ] **Milestone 5**: Background Scheduler (node-cron + CRON_SECRET webhooks), Mock AI Provider, Weekly Review & Spotify-style Monthly Rewind UI.
* [ ] **Milestone 6**: End-to-End Validation, Security Auditing, Deployment to Vercel (Frontend) and Render (Backend).

## Phase 3: Future Upgrades (Post-MVP)

* [ ] 100% Free Tier External AI Integration (e.g., Google Gemini API Free Tier).
* [ ] Authentication Upgrades: Google OAuth 2.0 / PKCE integration.
* [ ] CSV / JSON Data Export & Backup.
* [ ] Mobile PWA Optimization.
