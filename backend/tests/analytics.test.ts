import { describe, it, expect } from "vitest";
import {
  calculateTaskMetrics,
  calculateFocusScore,
  calculateHabitConsistency,
  getTierLabel,
  evaluateDailyMetrics,
  calculateDayOverDayDelta,
} from "../src/services/analytics/analyticsService";

describe("Milestone 3: Deterministic Analytics Engine (Layer 2)", () => {
  describe("Task Completion & High-Priority Rate Calculations", () => {
    it("should return inactive with 0 rates when 0 tasks are scheduled", () => {
      const res = calculateTaskMetrics([]);
      expect(res.isActive).toBe(false);
      expect(res.taskCompletionRate).toBe(0);
      expect(res.highPriorityRate).toBe(0);
      expect(res.tasksTotal).toBe(0);
    });

    it("should correctly compute overall completion rate and isolated high-priority rate", () => {
      const tasks: Array<{ isCompleted: boolean; priority: "LOW" | "MEDIUM" | "HIGH" }> = [
        { isCompleted: true, priority: "HIGH" },
        { isCompleted: false, priority: "HIGH" },
        { isCompleted: true, priority: "MEDIUM" },
        { isCompleted: true, priority: "LOW" },
      ];

      const res = calculateTaskMetrics(tasks);
      expect(res.isActive).toBe(true);
      expect(res.tasksTotal).toBe(4);
      expect(res.tasksCompleted).toBe(3);
      expect(res.taskCompletionRate).toBe(75); // 3 / 4 * 100 = 75%
      expect(res.highPriorityTotal).toBe(2);
      expect(res.highPriorityCompleted).toBe(1);
      expect(res.highPriorityRate).toBe(50); // 1 / 2 * 100 = 50%
    });

    it("should handle 100% completion correctly", () => {
      const tasks: Array<{ isCompleted: boolean; priority: "LOW" | "MEDIUM" | "HIGH" }> = [
        { isCompleted: true, priority: "HIGH" },
        { isCompleted: true, priority: "MEDIUM" },
      ];
      const res = calculateTaskMetrics(tasks);
      expect(res.taskCompletionRate).toBe(100);
      expect(res.highPriorityRate).toBe(100);
    });
  });

  describe("Focus Time Score Calculations", () => {
    it("should return inactive when 0 focus time logged and 0 target", () => {
      const res = calculateFocusScore(0, 0);
      expect(res.isActive).toBe(false);
      expect(res.focusScore).toBe(0);
    });

    it("should calculate proportional focus score", () => {
      const res = calculateFocusScore(60, 120);
      expect(res.isActive).toBe(true);
      expect(res.focusScore).toBe(50); // 60 / 120 = 50%
    });

    it("should cap focus score at 100% when logged minutes exceed daily target", () => {
      const res = calculateFocusScore(180, 120);
      expect(res.focusScore).toBe(100); // capped at 100, not 150%
    });
  });

  describe("Habit Consistency Calculations", () => {
    it("should return inactive when 0 habits are scheduled for the day", () => {
      const res = calculateHabitConsistency(0, 0);
      expect(res.isActive).toBe(false);
      expect(res.habitConsistency).toBe(0);
    });

    it("should calculate consistency rate correctly for scheduled habits", () => {
      const res = calculateHabitConsistency(3, 2);
      expect(res.isActive).toBe(true);
      expect(res.habitConsistency).toBe(67); // 2 / 3 * 100 = 66.67% -> 67%
    });
  });

  describe("Rest Day vs. Zero Output Logic", () => {
    const defaultWeights = { tasks: 40, focus: 35, habits: 25 };

    it("should classify an unlogged day with zero scheduled items as an unpenalized Rest Day", () => {
      const res = evaluateDailyMetrics({
        date: "2026-10-04",
        tasks: [],
        focusMinutes: 0,
        focusTargetMinutes: 120,
        habitsScheduled: 0,
        habitsCompleted: 0,
        weights: defaultWeights,
      });

      expect(res.status).toBe("REST_DAY");
      expect(res.isRestDay).toBe(true);
      expect(res.unifiedScore).toBeNull();
      expect(res.tierLabel).toBe("Rest Day");
      expect(res.activeModules).toHaveLength(0);
    });

    it("should classify a day with scheduled items but zero completion as Zero Output (score = 0.0)", () => {
      const res = evaluateDailyMetrics({
        date: "2026-10-05",
        tasks: [
          { isCompleted: false, priority: "HIGH" },
          { isCompleted: false, priority: "MEDIUM" },
        ],
        focusMinutes: 0,
        focusTargetMinutes: 120,
        habitsScheduled: 1,
        habitsCompleted: 0,
        weights: defaultWeights,
      });

      expect(res.status).toBe("ACTIVE");
      expect(res.isRestDay).toBe(false);
      expect(res.unifiedScore).toBe(0.0);
      expect(res.tierLabel).toBe("Needs more focus");
      expect(res.activeModules).toContain("tasks");
      expect(res.activeModules).toContain("habits");
    });
  });

  describe("Dynamic Weight Normalization", () => {
    it("should dynamically normalize weights when a module has no scheduled activity", () => {
      // Sunday scenario: no habits scheduled! Tasks 100% complete, focus 50%
      const weights = { tasks: 40, focus: 35, habits: 25 };

      const res = evaluateDailyMetrics({
        date: "2026-10-04", // Sunday
        tasks: [{ isCompleted: true, priority: "HIGH" }],
        focusMinutes: 60,
        focusTargetMinutes: 120, // 50%
        habitsScheduled: 0, // no habits today
        habitsCompleted: 0,
        weights,
      });

      expect(res.activeModules).toEqual(["tasks", "focus"]);
      // Active weights: Tasks 40/(40+35) = 53.33%, Focus 35/(40+35) = 46.67%
      // Composite = (100 * 0.5333) + (50 * 0.4667) = 53.33 + 23.33 = 76.67% -> Unified score ~ 7.7
      expect(res.unifiedScore).toBeGreaterThanOrEqual(7.6);
      expect(res.unifiedScore).toBeLessThanOrEqual(7.8);
      expect(res.tierLabel).toBe("Highly productive");
    });
  });

  describe("Qualitative Status Tiers", () => {
    it("should assign correct qualitative labels according to score ranges", () => {
      expect(getTierLabel(null)).toBe("Rest Day");
      expect(getTierLabel(0.0)).toBe("Needs more focus");
      expect(getTierLabel(4.9)).toBe("Needs more focus");
      expect(getTierLabel(5.0)).toBe("Doing great");
      expect(getTierLabel(7.4)).toBe("Doing great");
      expect(getTierLabel(7.5)).toBe("Highly productive");
      expect(getTierLabel(10.0)).toBe("Highly productive");
    });
  });

  describe("Day-over-Day Momentum & Slope Indicators", () => {
    const weights = { tasks: 40, focus: 35, habits: 25 };

    it("should indicate UP direction when today score is higher than yesterday", () => {
      const today = evaluateDailyMetrics({
        date: "2026-10-05",
        tasks: [{ isCompleted: true, priority: "HIGH" }],
        focusMinutes: 120,
        focusTargetMinutes: 120,
        habitsScheduled: 1,
        habitsCompleted: 1,
        weights,
      }); // Score = 10.0

      const yesterday = evaluateDailyMetrics({
        date: "2026-10-04",
        tasks: [{ isCompleted: true, priority: "MEDIUM" }],
        focusMinutes: 60,
        focusTargetMinutes: 120,
        habitsScheduled: 1,
        habitsCompleted: 0,
        weights,
      }); // Score ~ 6.0

      const delta = calculateDayOverDayDelta(today, yesterday);
      expect(delta.direction).toBe("UP");
      expect(delta.scoreDelta).toBeGreaterThan(0);
    });

    it("should indicate DOWN direction when today score drops", () => {
      const today = evaluateDailyMetrics({
        date: "2026-10-05",
        tasks: [{ isCompleted: false, priority: "HIGH" }],
        focusMinutes: 30,
        focusTargetMinutes: 120,
        habitsScheduled: 1,
        habitsCompleted: 0,
        weights,
      });

      const yesterday = evaluateDailyMetrics({
        date: "2026-10-04",
        tasks: [{ isCompleted: true, priority: "HIGH" }],
        focusMinutes: 120,
        focusTargetMinutes: 120,
        habitsScheduled: 1,
        habitsCompleted: 1,
        weights,
      });

      const delta = calculateDayOverDayDelta(today, yesterday);
      expect(delta.direction).toBe("DOWN");
      expect(delta.scoreDelta).toBeLessThan(0);
    });

    it("should return NO_DATA when comparing against a Rest Day", () => {
      const today = evaluateDailyMetrics({
        date: "2026-10-05",
        tasks: [{ isCompleted: true, priority: "HIGH" }],
        focusMinutes: 60,
        focusTargetMinutes: 120,
        habitsScheduled: 0,
        habitsCompleted: 0,
        weights,
      });

      const yesterdayRest = evaluateDailyMetrics({
        date: "2026-10-04",
        tasks: [],
        focusMinutes: 0,
        focusTargetMinutes: 120,
        habitsScheduled: 0,
        habitsCompleted: 0,
        weights,
      });

      const delta = calculateDayOverDayDelta(today, yesterdayRest);
      expect(delta.direction).toBe("NO_DATA");
      expect(delta.scoreDelta).toBeNull();
    });
  });
});
