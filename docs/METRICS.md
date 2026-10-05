# LifeGauge: Metrics & Scoring Mathematics

## 1. Modular Independent Metrics (0–100 Scale)

### 1.1 Task Completion Rate ($M_{\text{task}}$)
$$\text{Task Completion Rate} = \frac{\text{Completed Tasks Due Today}}{\text{Total Tasks Due Today}} \times 100$$
* If no tasks were due today, this module is marked as inactive for daily composite calculation.

### 1.2 High-Priority Completion Rate
$$\text{High-Priority Rate} = \frac{\text{Completed High-Priority Tasks Due Today}}{\text{Total High-Priority Tasks Due Today}} \times 100$$
* Displayed as an isolated metric alongside overall task completion; does not skew the standard task completion rate.

### 1.3 Focus Time Score ($M_{\text{focus}}$)
$$\text{Focus Score} = \min\left(100, \frac{\text{Actual Logged Focus Minutes}}{\text{User Daily Focus Target Minutes}} \times 100\right)$$
* User daily target defaults to 120 minutes (configurable).

### 1.4 Habit Consistency Rate ($M_{\text{habit}}$)
$$\text{Habit Consistency} = \frac{\text{Habits Completed Today}}{\text{Habits Scheduled for Today's Day-of-Week}} \times 100$$
* A habit only counts toward today's denominator if today's day-of-week (e.g., "MON", "TUE") is in the habit's `targetDays` definition.

---

## 2. Missing Data vs. Zero Performance

### Rest Day
* **Condition**: A day with 0 scheduled tasks and 0 scheduled habits.
* **Evaluation**: Classified as an unpenalized **"Rest Day"** (`status: "REST_DAY"`).
* **Impact**: Excluded from streak resets and productivity score averages.

### Zero Output
* **Condition**: Tasks or habits were scheduled for the day, but 0 were completed.
* **Evaluation**: Classified as **"Zero Output"** (`status: "ACTIVE"`, `score: 0.0`).
* **Impact**: Counts as 0.0 in averages and triggers constructive encouragement.

---

## 3. Dynamic Weight Normalization & Unified 0–10 Gauge

### User Weights
* $W_{\text{task}}$ (default: 40)
* $W_{\text{focus}}$ (default: 35)
* $W_{\text{habit}}$ (default: 25)

### Normalization Formula
When a module has no scheduled activity on a given day (e.g., no habits scheduled on Sunday), its weight drops out so the user is not artificially penalized:

$$\text{Active Weights Sum} = \sum_{m \in \text{ActiveModules}} W_m$$

$$\text{Unified Score (0–10)} = \frac{\sum_{m \in \text{ActiveModules}} (M_m \times W_m)}{\text{Active Weights Sum}} \times \frac{1}{10}$$

### Qualitative Status Tiers
* `0.0 – 4.9`: *"Needs more focus"* (with encouragement)
* `5.0 – 7.4`: *"Doing great / Steady progress"*
* `7.5 – 10.0`: *"Highly productive day"*

---

## 4. Momentum & Stock-Style Trajectory
* **Daily Momentum**: $\Delta = \text{Score}_{\text{today}} - \text{Score}_{\text{yesterday}}$
* **Slope Indicator**:
  * $\Delta > 0$: Upward slope (green accent)
  * $\Delta = 0$: Stable plateau
  * $\Delta < 0$: Downward slope (amber/red accent)
