# LifeGauge: Project Specification

## 1. Overview
LifeGauge is an AI-assisted personal productivity and life analytics platform. It unifies tasks, priorities, deadlines, focus/time sessions, and selected daily habits into one centralized system. It converts the user's recorded activity into transparent, deterministic productivity metrics and visual trends, and uses AI selectively to interpret those analytics into concise, personalized observations and recommendations.

### Core Philosophy
* **Analytics-First, Not Chatbot-First**: LifeGauge is a personal analytics dashboard and decision-support system, not a conversational chatbot or a to-do list clone.
* **Deterministic Calculations**: The application backend is the sole source of truth for all metrics. The AI never calculates, guesses, or invents metrics.
* **Personal Growth Over Judgment**: The productivity score is a personal tracking indicator to compare one's own activity over time, never a definitive measure of a person's worth or overall ability.

---

## 2. Core Functional Modules

### 2.1 Tasks
* Ad-hoc and scheduled tasks with title, description, due date, and priority (`LOW`, `MEDIUM`, `HIGH`).
* Boolean completion status (`isCompleted`) and completion timestamp (`completedAt`).
* Task completion percentage is calculated as `(Completed Tasks / Total Scheduled Tasks) * 100`.
* High-Priority Completion Rate is displayed as an isolated, dedicated metric alongside overall completion.

### 2.2 Habits & Daily Commitments
* Recurring routines (e.g., wake up at 6 AM, DSA practice, shower) tracked on user-selected days of the week (`targetDays`, e.g., Mon–Fri or everyday).
* Boolean completion per calendar date (`YYYY-MM-DD`).
* Visualized via an interactive **Habit Punchcard Matrix** (LeetCode / GitHub style):
  * Calendar dates on the X-axis (top).
  * Habit titles on the Y-axis.
  * Square cells: Bright green for completed, warm orange/muted for missed, neutral gray for rest/unscheduled days.

### 2.3 Focus & Time Tracking (Time Blocking)
* Retrospective manual time-block logging (Google Calendar style).
* Fields: Date, start time, end time, duration in minutes, activity category (e.g., "DSA", "Study", "Work", "Fitness"), and optional task link.
* Does not require task completion—captures focused effort and time distribution.

### 2.4 Deterministic Analytics Engine (Layer 2)
* **Modular Metrics (0–100%)**:
  * Task Completion Rate
  * High-Priority Completion Rate
  * Focus Time Score (actual vs. user daily target)
  * Habit Consistency Rate (completed vs. scheduled for that day of week)
* **Missing Data vs. Zero Performance**:
  * **Rest Day**: If no tasks or habits are scheduled for a day, the day is classified as an unpenalized "Rest Day" and excluded from productivity score averages and streak penalties.
  * **Zero Output**: If tasks or habits were scheduled but none were completed, the day is evaluated with 0 output (Score = 0.0).
* **Dynamic Weight Normalization**:
  * If a module has no scheduled activity on a day (e.g., no habits scheduled on Sunday), its weight automatically drops out and remaining active modules normalize to 100%.
* **Optional Unified 0–10 Gauge**:
  * Weighted average across active modules scaled to 0–10.
  * Tiered qualitative feedback:
    * `0.0 – 4.9`: *"Needs more focus"* (with constructive encouragement)
    * `5.0 – 7.4`: *"Doing great / Steady progress"*
    * `7.5 – 10.0`: *"Highly productive day"*

### 2.5 AI Retrospectives (Layer 3)
* **Weekly Review**: Automatic end-of-week analysis comparing the completed week with the previous week (completion patterns, focus distribution, habit consistency, practical suggestions).
* **Monthly Rewind**: Automatic retrospective around the 28th of each month (Spotify Wrapped / Codolio Rewind style) highlighting standout days, time distribution, and habits.
* **Background Scheduling**:
  * In-process scheduler via `node-cron` for local development.
  * Webhook trigger endpoints (`POST /api/jobs/...`) secured with `CRON_SECRET` for production triggers (e.g., external free HTTP cron services).
  * Strict idempotency: Checks existing records before running to prevent duplicate reviews.

---

## 3. Technology Stack
* **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts.
* **Backend**: Node.js, Express, TypeScript, Prisma ORM.
* **Database**: Hosted MySQL (e.g., Aiven) with non-destructive migrations.
* **Authentication**: Form-based email/password, bcrypt password hashing, Bearer JWT stored in client `localStorage` with route guards.
