export interface ModuleScores {
  taskCompletionRate: number;      // 0 - 100
  highPriorityRate: number;        // 0 - 100
  focusScore: number;              // 0 - 100
  habitConsistency: number;        // 0 - 100
}

export interface DailyMetricsResult {
  date: string;                     // YYYY-MM-DD
  status: "ACTIVE" | "REST_DAY";
  isRestDay: boolean;
  moduleScores: ModuleScores;
  activeModules: Array<"tasks" | "focus" | "habits">;
  unifiedScore: number | null;      // 0.0 - 10.0, or null for Rest Day
  tierLabel: string;                // "Needs more focus" | "Doing great" | "Highly productive" | "Rest Day"
  focusMinutes: number;
  focusTargetMinutes: number;
  tasksCompleted: number;
  tasksTotal: number;
  highPriorityCompleted: number;
  highPriorityTotal: number;
  habitsCompleted: number;
  habitsScheduled: number;
  weightsApplied: {
    tasks: number;
    focus: number;
    habits: number;
  };
}

export interface DayOverDayDelta {
  scoreDelta: number | null;
  direction: "UP" | "DOWN" | "STABLE" | "NO_DATA";
  taskRateDelta: number;
  focusMinutesDelta: number;
  habitRateDelta: number;
}

/**
 * Calculates Task Completion Rate and isolated High-Priority Rate.
 * Formula: (Completed Tasks / Total Tasks) * 100
 */
export function calculateTaskMetrics(
  tasks: Array<{ isCompleted: boolean; priority: "LOW" | "MEDIUM" | "HIGH" }>
): {
  taskCompletionRate: number;
  highPriorityRate: number;
  tasksCompleted: number;
  tasksTotal: number;
  highPriorityCompleted: number;
  highPriorityTotal: number;
  isActive: boolean;
} {
  const total = tasks.length;
  if (total === 0) {
    return {
      taskCompletionRate: 0,
      highPriorityRate: 0,
      tasksCompleted: 0,
      tasksTotal: 0,
      highPriorityCompleted: 0,
      highPriorityTotal: 0,
      isActive: false,
    };
  }

  const completed = tasks.filter((t) => t.isCompleted).length;
  const highPriorityTasks = tasks.filter((t) => t.priority === "HIGH");
  const highPriorityTotal = highPriorityTasks.length;
  const highPriorityCompleted = highPriorityTasks.filter((t) => t.isCompleted).length;

  const taskCompletionRate = Math.round((completed / total) * 100);
  const highPriorityRate =
    highPriorityTotal > 0
      ? Math.round((highPriorityCompleted / highPriorityTotal) * 100)
      : 0;

  return {
    taskCompletionRate,
    highPriorityRate,
    tasksCompleted: completed,
    tasksTotal: total,
    highPriorityCompleted,
    highPriorityTotal,
    isActive: true,
  };
}

/**
 * Calculates Focus Score based on logged minutes vs user daily target.
 * Formula: min(100, (actual / target) * 100)
 */
export function calculateFocusScore(
  totalMinutes: number,
  targetMinutes: number
): { focusScore: number; isActive: boolean } {
  if (targetMinutes <= 0) {
    return { focusScore: 0, isActive: false };
  }

  const focusScore = Math.min(100, Math.round((totalMinutes / targetMinutes) * 100));
  // Active if user logged any time or target was set
  const isActive = totalMinutes > 0;
  return { focusScore, isActive };
}

/**
 * Calculates Habit Consistency for habits scheduled on this specific day.
 * Formula: (Completed Scheduled Habits / Total Scheduled Habits) * 100
 */
export function calculateHabitConsistency(
  habitsScheduled: number,
  habitsCompleted: number
): { habitConsistency: number; isActive: boolean } {
  if (habitsScheduled === 0) {
    return { habitConsistency: 0, isActive: false };
  }

  const habitConsistency = Math.min(
    100,
    Math.round((habitsCompleted / habitsScheduled) * 100)
  );

  return { habitConsistency, isActive: true };
}

/**
 * Evaluates Tier Label for a 0.0 - 10.0 Unified Score.
 */
export function getTierLabel(score: number | null): string {
  if (score === null) return "Rest Day";
  if (score < 5.0) return "Needs more focus";
  if (score < 7.5) return "Doing great";
  return "Highly productive";
}

/**
 * Evaluates Dynamic Weight Normalization and Binary Active vs. Rest Day logic.
 */
export function evaluateDailyMetrics(params: {
  date: string;
  tasks: Array<{ isCompleted: boolean; priority: "LOW" | "MEDIUM" | "HIGH" }>;
  focusMinutes: number;
  focusTargetMinutes: number;
  habitsScheduled: number;
  habitsCompleted: number;
  weights: { tasks: number; focus: number; habits: number };
}): DailyMetricsResult {
  const {
    date,
    tasks,
    focusMinutes,
    focusTargetMinutes,
    habitsScheduled,
    habitsCompleted,
    weights,
  } = params;

  const taskRes = calculateTaskMetrics(tasks);
  const focusRes = calculateFocusScore(focusMinutes, focusTargetMinutes);
  const habitRes = calculateHabitConsistency(habitsScheduled, habitsCompleted);

  // Binary Active vs Rest Day:
  // If no tasks were scheduled and no habits were scheduled, and 0 focus logged: Rest Day
  const hasScheduledActivity = taskRes.isActive || habitRes.isActive || focusRes.isActive;

  if (!hasScheduledActivity) {
    return {
      date,
      status: "REST_DAY",
      isRestDay: true,
      moduleScores: {
        taskCompletionRate: 0,
        highPriorityRate: 0,
        focusScore: 0,
        habitConsistency: 0,
      },
      activeModules: [],
      unifiedScore: null,
      tierLabel: "Rest Day",
      focusMinutes,
      focusTargetMinutes,
      tasksCompleted: 0,
      tasksTotal: 0,
      highPriorityCompleted: 0,
      highPriorityTotal: 0,
      habitsCompleted: 0,
      habitsScheduled: 0,
      weightsApplied: { tasks: 0, focus: 0, habits: 0 },
    };
  }

  // Dynamic Weight Normalization:
  // Drop weights of inactive modules and normalize remaining active weights
  const activeModules: Array<"tasks" | "focus" | "habits"> = [];
  let activeWeightSum = 0;

  if (taskRes.isActive) {
    activeModules.push("tasks");
    activeWeightSum += weights.tasks;
  }
  if (focusRes.isActive) {
    activeModules.push("focus");
    activeWeightSum += weights.focus;
  }
  if (habitRes.isActive) {
    activeModules.push("habits");
    activeWeightSum += weights.habits;
  }

  // If zero scheduled items were completed, but items WERE scheduled -> Zero Output (score = 0.0)
  if (activeWeightSum === 0) {
    // Edge case: active scheduled was 0 (covered by Rest Day above)
    return {
      date,
      status: "REST_DAY",
      isRestDay: true,
      moduleScores: {
        taskCompletionRate: 0,
        highPriorityRate: 0,
        focusScore: 0,
        habitConsistency: 0,
      },
      activeModules: [],
      unifiedScore: null,
      tierLabel: "Rest Day",
      focusMinutes,
      focusTargetMinutes,
      tasksCompleted: 0,
      tasksTotal: 0,
      highPriorityCompleted: 0,
      highPriorityTotal: 0,
      habitsCompleted: 0,
      habitsScheduled: 0,
      weightsApplied: { tasks: 0, focus: 0, habits: 0 },
    };
  }

  const normalizedWeights = {
    tasks: taskRes.isActive ? weights.tasks / activeWeightSum : 0,
    focus: focusRes.isActive ? weights.focus / activeWeightSum : 0,
    habits: habitRes.isActive ? weights.habits / activeWeightSum : 0,
  };

  const compositeHundred =
    taskRes.taskCompletionRate * normalizedWeights.tasks +
    focusRes.focusScore * normalizedWeights.focus +
    habitRes.habitConsistency * normalizedWeights.habits;

  // Scale 0-100 to 0.0-10.0 rounded to 1 decimal place
  const unifiedScore = parseFloat((compositeHundred / 10).toFixed(1));
  const tierLabel = getTierLabel(unifiedScore);

  return {
    date,
    status: "ACTIVE",
    isRestDay: false,
    moduleScores: {
      taskCompletionRate: taskRes.taskCompletionRate,
      highPriorityRate: taskRes.highPriorityRate,
      focusScore: focusRes.focusScore,
      habitConsistency: habitRes.habitConsistency,
    },
    activeModules,
    unifiedScore,
    tierLabel,
    focusMinutes,
    focusTargetMinutes,
    tasksCompleted: taskRes.tasksCompleted,
    tasksTotal: taskRes.tasksTotal,
    highPriorityCompleted: taskRes.highPriorityCompleted,
    highPriorityTotal: taskRes.highPriorityTotal,
    habitsCompleted,
    habitsScheduled,
    weightsApplied: {
      tasks: Math.round(normalizedWeights.tasks * 100),
      focus: Math.round(normalizedWeights.focus * 100),
      habits: Math.round(normalizedWeights.habits * 100),
    },
  };
}

/**
 * Calculates day-over-day delta and momentum slope indicator.
 */
export function calculateDayOverDayDelta(
  today: DailyMetricsResult,
  yesterday: DailyMetricsResult | null
): DayOverDayDelta {
  if (!yesterday || today.unifiedScore === null || yesterday.unifiedScore === null) {
    return {
      scoreDelta: null,
      direction: "NO_DATA",
      taskRateDelta: 0,
      focusMinutesDelta: 0,
      habitRateDelta: 0,
    };
  }

  const scoreDelta = parseFloat((today.unifiedScore - yesterday.unifiedScore).toFixed(1));
  let direction: "UP" | "DOWN" | "STABLE" = "STABLE";

  if (scoreDelta > 0) direction = "UP";
  else if (scoreDelta < 0) direction = "DOWN";

  const taskRateDelta =
    today.moduleScores.taskCompletionRate - yesterday.moduleScores.taskCompletionRate;
  const focusMinutesDelta = today.focusMinutes - yesterday.focusMinutes;
  const habitRateDelta =
    today.moduleScores.habitConsistency - yesterday.moduleScores.habitConsistency;

  return {
    scoreDelta,
    direction,
    taskRateDelta,
    focusMinutesDelta,
    habitRateDelta,
  };
}
