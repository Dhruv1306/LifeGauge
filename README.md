
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

## 📦 Why Does Each Dependency Exist? (Plain English Guide)

Every tool and package in LifeGauge was chosen with a specific purpose. Here is what each one does and why it's here, explained simply:

### Backend Production Dependencies (`backend/package.json`)

* **`express` (The Post Office & Traffic Director)**:
  * *What it does*: It is the web framework that runs our backend server. Whenever your browser wants to save a task, log in, or load habits, it sends a request over the internet. Express receives that request, directs it to the right piece of code, and sends back the answer as JSON.
* **`@prisma/client` (The Database Bridge)**:
  * *What it does*: Lets our Node.js code talk directly to our MySQL database. Instead of writing messy, error-prone SQL code strings by hand, Prisma gives us clean, auto-completed JavaScript functions (like `prisma.task.create(...)`) with full type safety.
* **`bcryptjs` (The Password Scrambler)**:
  * *What it does*: Keeps user passwords safe. We never store plain text passwords in the database (because if someone peeked at the database, they could steal accounts). `bcryptjs` turns `"mySecretPassword123"` into a super-secure scrambled code (hash) that cannot be reverse-engineered.
* **`jsonwebtoken` / JWT (The Digital VIP Wristband)**:
  * *What it does*: When you log in with your email and password, the server gives you a signed digital wristband called a "JWT token". On every future request, your browser simply shows this token so the server knows who you are without asking you to re-type your password on every single click.
* **`zod` (The Security Bouncer & Form Inspector)**:
  * *What it does*: Checks incoming data before it touches our database. If someone tries to register with an invalid email or a password that is too short, Zod catches it instantly and politely tells them what needs fixing.
* **`cors` (The Friendly Neighbor Pass)**:
  * *What it does*: Stands for "Cross-Origin Resource Sharing". When our frontend (hosted on Vercel or running on port 5173) asks our backend (hosted on Render or port 5000) for data, web browsers block it by default for safety. `cors` tells the browser: *"It's okay! This frontend is our friend, let them talk to us."*
* **`dotenv` (The Secret Safe)**:
  * *What it does*: Keeps sensitive settings (like database passwords and secret tokens) inside a private `.env` file that is never shared publicly on GitHub. `dotenv` reads that file and makes those secrets available inside our code.
* **`node-cron` (The Automatic Alarm Clock)**:
  * *What it does*: A background timer that triggers code at scheduled times. We use it to automatically generate your Weekly Review every Monday and your Monthly Rewind on the 28th of every month, even if you don't open the app.

---

### Backend Developer & Build Tools (`devDependencies`)

* **`ts-node-dev` (The Instant Live Restarter)**:
  * *What it does*: Runs our TypeScript backend during development. The `--respawn` flag automatically restarts the server the exact second you edit and save a file.
  * *Why we do NOT need Nodemon*: `ts-node-dev` already does the job of Nodemon, but with built-in TypeScript speed. Installing both Nodemon and `ts-node-dev` would be completely redundant and waste computer memory.
* **`typescript` (The Error Prevention Shield)**:
  * *What it does*: Adds clear types (strings, numbers, dates) to JavaScript. It catches typos, missing properties, and bugs while you are typing before the code ever runs.
* **`prisma` (The Database Blueprint Architect)**:
  * *What it does*: The command-line tool that reads our `schema.prisma` file and creates the exact tables, columns, and foreign keys in MySQL.
* **`vitest` (The Automated Quality Inspector)**:
  * *What it does*: A lightning-fast testing tool. It automatically runs our test files (like checking that password hashing and token generation work 100% reliably) so we know nothing is broken.
* **`@types/express`, `@types/bcryptjs`, `@types/cors`, `@types/jsonwebtoken`, `@types/node`, `@types/node-cron` (The TypeScript Dictionaries)**:
  * *What they do*: These packages tell TypeScript what functions and types exist inside external JavaScript libraries so you get helpful autocomplete suggestions in your editor without any guesswork.

---

### Frontend Production Dependencies (`frontend/package.json`)

* **`react` & `react-dom` (The Lego Bricks & Master Builder)**:
  * *What they do*: React lets us build our user interface out of interactive, reusable Lego blocks (called "components") like cards, score gauges, and buttons. When a score changes, React updates only that specific number on the screen smoothly without reloading the entire page.
* **`react-router-dom` (The GPS & Tour Guide)**:
  * *What it does*: Handles page navigation inside our app (like jumping between the Cockpit, Tasks, Habits, and Time Blocks) instantly in the browser without making the browser reload or flicker.
* **`recharts` (The Master Artist for Charts)**:
  * *What it does*: Turns raw numbers and dates into beautiful SVG charts. We use it to draw the stock-style momentum trajectory line and area curves with smooth gradients and hover tooltips.
* **`lucide-react` (The Icon Toolbox)**:
  * *What it does*: A clean library of icons (like gauges, flames, clocks, checkboxes, and sliders) that make the cockpit look modern and intuitive.
* **`axios` (The Reliable Courier)**:
  * *What it does*: Sends HTTP messages between our React frontend and Express backend. We configured it with an automatic badge pass: every time it sends a request, it automatically attaches your Bearer token so the backend knows it's you!
* **`clsx` & `tailwind-merge` (The Class Harmonizers)**:
  * *What they do*: Helper utilities that let us combine and toggle Tailwind CSS styles conditionally (for example, turning a cell green if a habit is done or orange if missed) without messy class conflicts.

---

### Frontend Developer & Build Tools (`devDependencies`)

* **`vite` & `@vitejs/plugin-react` (The Supersonic Rocket Launcher)**:
  * *What they do*: The modern build tool that bundles and runs our React application with near-instant hot-reloading while we develop and minifies code into ultra-fast static assets for deployment to Vercel.
* **`tailwindcss`, `postcss`, `autoprefixer` (The Instant Stylist & Wardrobe)**:
  * *What they do*: A modern utility CSS framework. Instead of writing separate CSS files with hundreds of lines, Tailwind lets us style buttons, cards, and grids directly using clean utility names (like `bg-slate-900`, `text-emerald-400`, `rounded-2xl`).

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
Copy-Item backend\.env.example backend\.env

# Run database migrations
npm run prisma:migrate --workspace=backend

# Start backend development server
npm run dev
```

---

## License

MIT
