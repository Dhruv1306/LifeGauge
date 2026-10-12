# LifeGauge: Completed Product User Journey

This diagram shows the intended experience when the project is fully completed. It includes the browser journey, backend processes, database, analytics, AI retrospectives, and scheduled jobs described by the project specification.

```mermaid
flowchart TD
    A[User opens LifeGauge] --> B{Has an account?}
    B -->|No| C[Register name, email, password]
    B -->|Yes| D[Sign in]
    C -.-> E[Backend validates input with Zod]
    D -.-> E
    E -.-> F[Backend hashes or verifies password with bcrypt]
    F -.-> G[JWT issued]
    G --> H[Frontend stores session token]
    H --> I[Protected dashboard]

    I --> J[Dashboard loads profile and settings]
    I --> K[Create and complete tasks]
    I --> L[Create habits and mark daily logs]
    I --> M[Log retrospective focus blocks]
    I --> N[View daily metrics and momentum]

    K -.-> O[Express task routes]
    L -.-> P[Express habit routes]
    M -.-> Q[Express time-entry routes]
    J -.-> R[Express user routes]
    N -.-> S[Express analytics routes]

    O -.-> T[JWT middleware and userId isolation]
    P -.-> T
    Q -.-> T
    R -.-> T
    S -.-> T
    T -.-> U[Prisma data access]
    U -.-> V[(MySQL: users, tasks, habits, logs, time entries)]

    V -.-> W[Deterministic analytics engine]
    W -.-> X[Task, focus, habit scores]
    W -.-> Y[Dynamic weights and rest-day rules]
    W -.-> Z[0-10 gauge and momentum deltas]
    X --> AA[Dashboard charts and score cards]
    Y --> AA
    Z --> AA

    W -.-> AB[Immutable weekly/monthly factsheet]
    AB -.-> AC[Mock or external AI interpretation]
    AC -.-> AD[Zod output and consistency guardrails]
    AD -.-> AE[(Persisted weekly reviews and monthly rewinds)]
    AE --> AF[User reads personalized retrospective]

    AG[Scheduled node-cron or secure cloud webhook] -.-> AH[Idempotent review job]
    AH -.-> AB
```

* [ ] Solid arrows represent browser-visible screens, user actions, and responses rendered in the frontend. Dotted arrows represent server-side work, database access, analytics, validation, scheduling, and AI processing that the user does not see directly.

## Intended Finished Screens

```mermaid
flowchart LR
    Login[Login / Register] --> Dashboard[Analytics Dashboard]
    Dashboard --> Tasks[Tasks and Priorities]
    Dashboard --> Habits[Habit Punchcard]
    Dashboard --> Time[Focus and Time Blocks]
    Dashboard --> Reviews[Weekly Review and Monthly Rewind]
    Dashboard --> Settings[Weights and Profile Settings]
```

* [ ] The finished system keeps deterministic calculations in the backend. AI interprets prepared factsheets but does not calculate or invent the user's metrics.
