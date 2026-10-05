# LifeGauge: AI Insights & Retrospective Architecture

## 1. Core Principle
* The AI layer is an **interpretation and decision-support engine**, not a metric calculator.
* The application's deterministic analytics engine (Layer 2) prepares an immutable, structured JSON factsheet.
* The AI receives the factsheet, identifies patterns, and produces structured observations and recommendations.
* AI must **never** invent user activity, guess missing metrics, or override deterministic scores.

---

## 2. Structured Factsheet Schema (Input to AI)

```typescript
export interface WeeklyFactsheet {
  userId: string;
  year: number;
  weekNumber: number;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  metrics: {
    taskCompletionRate: number;      // 0 - 100
    highPriorityCompletionRate: number; // 0 - 100
    totalTasksCompleted: number;
    totalTasksScheduled: number;
    totalFocusMinutes: number;
    topCategory: string;
    habitConsistencyRate: number;    // 0 - 100
    activeDaysCount: number;
    restDaysCount: number;
    averageDailyScore: number;       // 0.0 - 10.0
  };
  deltasVsPreviousWeek: {
    taskCompletionDelta: number;     // e.g. +12.5%
    focusHoursDelta: number;         // e.g. -2.0 hrs
    habitConsistencyDelta: number;   // e.g. +5.0%
    scoreDelta: number;              // e.g. +0.8
  };
  habitsSummary: Array<{
    title: string;
    completedDays: number;
    targetDaysCount: number;
  }>;
  categoryDistribution: Array<{
    category: string;
    minutes: number;
    percentage: number;
  }>;
}
```

---

## 3. Strict Output Schema (Zod Validation)

```typescript
import { z } from "zod";

export const AIReviewOutputSchema = z.object({
  periodSummary: z.string().min(10).max(500),
  keyObservations: z.array(z.string().min(5).max(300)).min(1).max(5),
  practicalSuggestions: z.array(z.string().min(5).max(300)).min(1).max(4)
});

export type AIReviewOutput = z.infer<typeof AIReviewOutputSchema>;
```

---

## 4. Multi-Layer Guardrails Against Hallucination
1. **Deterministic Pre-Aggregation**: AI is never asked to calculate sums, averages, or counts.
2. **Schema Enforcement**: AI response must parse via Zod before persistence.
3. **Post-Generation Consistency Filter**: Server-side validator checks that any category or hour cited in the text exists in the input factsheet.
4. **UI Traceability**: Observations are displayed alongside raw metric badges for visual verification by the user.

---

## 5. Mock AI Provider (Phase 1)
During core app development, an offline Mock AI Provider produces structured reviews deterministically derived from the input factsheet:
* Identifies the highest focus category and quotes actual hours.
* Compares habit consistency vs. the previous week.
* Produces constructive, realistic suggestions without any external API calls or latency.
* Facilitates complete offline development and end-to-end testing with zero cost.
