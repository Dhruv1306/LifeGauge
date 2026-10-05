import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../types";
import {
  evaluateDailyMetrics,
  calculateDayOverDayDelta,
  DailyMetricsResult,
} from "../services/analytics/analyticsService";

const DAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

function getDayCode(dateStr: string): typeof DAY_CODES[number] {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return DAY_CODES[date.getUTCDay()];
}

function getPreviousDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().split("T")[0];
}

async function fetchDayMetrics(
  userId: string,
  dateStr: string,
  weights: { weightTasks: number; weightFocus: number; weightHabits: number; dailyFocusTargetMin: number }
): Promise<DailyMetricsResult> {
  const dayCode = getDayCode(dateStr);

  const [startOfDay, endOfDay] = [
    new Date(`${dateStr}T00:00:00.000Z`),
    new Date(`${dateStr}T23:59:59.999Z`),
  ];

  // Fetch tasks due on this date or completed on this date
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      OR: [
        { dueDate: { gte: startOfDay, lte: endOfDay } },
        { completedAt: { gte: startOfDay, lte: endOfDay } },
      ],
    },
    select: { isCompleted: true, priority: true },
  });

  // Fetch time entries logged for this date
  const timeEntries = await prisma.timeEntry.findMany({
    where: { userId, date: dateStr },
    select: { durationMin: true },
  });

  const totalFocusMinutes = timeEntries.reduce((acc, curr) => acc + curr.durationMin, 0);

  // Fetch active habits and logs for this date
  const habits = await prisma.habit.findMany({
    where: { userId, isActive: true },
    include: {
      logs: {
        where: { date: dateStr },
      },
    },
  });

  let habitsScheduled = 0;
  let habitsCompleted = 0;

  for (const habit of habits) {
    const isScheduled =
      !habit.targetDays ||
      habit.targetDays.toUpperCase() === "ALL" ||
      habit.targetDays.toUpperCase().split(",").map((s) => s.trim()).includes(dayCode);

    if (isScheduled) {
      habitsScheduled += 1;
      const isCompleted = habit.logs.some((l) => l.isCompleted);
      if (isCompleted) habitsCompleted += 1;
    }
  }

  return evaluateDailyMetrics({
    date: dateStr,
    tasks,
    focusMinutes: totalFocusMinutes,
    focusTargetMinutes: weights.dailyFocusTargetMin || 120,
    habitsScheduled,
    habitsCompleted,
    weights: {
      tasks: weights.weightTasks,
      focus: weights.weightFocus,
      habits: weights.weightHabits,
    },
  });
}

export async function getDailyAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
  const previousDate = getPreviousDate(date);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      weightTasks: true,
      weightFocus: true,
      weightHabits: true,
      dailyFocusTargetMin: true,
    },
  });

  if (!user) {
    res.status(404).json({ success: false, error: "User not found" });
    return;
  }

  const todayMetrics = await fetchDayMetrics(userId, date, user);
  const yesterdayMetrics = await fetchDayMetrics(userId, previousDate, user);
  const delta = calculateDayOverDayDelta(todayMetrics, yesterdayMetrics);

  res.status(200).json({
    success: true,
    date,
    metrics: todayMetrics,
    delta,
  });
}

export async function getMomentumTimeSeries(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const daysCount = Math.min(90, Math.max(7, parseInt((req.query.days as string) || "14", 10)));

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      weightTasks: true,
      weightFocus: true,
      weightHabits: true,
      dailyFocusTargetMin: true,
    },
  });

  if (!user) {
    res.status(404).json({ success: false, error: "User not found" });
    return;
  }

  const today = new Date();
  const dateList: string[] = [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    dateList.push(d.toISOString().split("T")[0]);
  }

  const timeSeries: Array<{
    date: string;
    dayLabel: string;
    score: number | null;
    displayScore: number;
    status: string;
    isRestDay: boolean;
    focusMinutes: number;
    focusHours: number;
    taskCompletionRate: number;
    habitConsistency: number;
  }> = [];

  let activeScoreSum = 0;
  let activeDaysCount = 0;

  for (const dateStr of dateList) {
    const dayMetrics = await fetchDayMetrics(userId, dateStr, user);
    const dayCode = getDayCode(dateStr);

    if (dayMetrics.unifiedScore !== null) {
      activeScoreSum += dayMetrics.unifiedScore;
      activeDaysCount += 1;
    }

    timeSeries.push({
      date: dateStr,
      dayLabel: `${dayCode} ${dateStr.slice(5)}`,
      score: dayMetrics.unifiedScore,
      displayScore: dayMetrics.unifiedScore !== null ? dayMetrics.unifiedScore : 0,
      status: dayMetrics.status,
      isRestDay: dayMetrics.isRestDay,
      focusMinutes: dayMetrics.focusMinutes,
      focusHours: parseFloat((dayMetrics.focusMinutes / 60).toFixed(1)),
      taskCompletionRate: dayMetrics.moduleScores.taskCompletionRate,
      habitConsistency: dayMetrics.moduleScores.habitConsistency,
    });
  }

  const averageScore =
    activeDaysCount > 0 ? parseFloat((activeScoreSum / activeDaysCount).toFixed(1)) : 0;

  res.status(200).json({
    success: true,
    daysCount,
    averageScore,
    activeDaysCount,
    restDaysCount: daysCount - activeDaysCount,
    timeSeries,
  });
}

export async function getPeriodComparison(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const period = (req.query.period as string) || "week"; // "day" | "week" | "month"

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      weightTasks: true,
      weightFocus: true,
      weightHabits: true,
      dailyFocusTargetMin: true,
    },
  });

  if (!user) {
    res.status(404).json({ success: false, error: "User not found" });
    return;
  }

  const today = new Date();
  let currentDates: string[] = [];
  let previousDates: string[] = [];

  if (period === "day") {
    const todayStr = today.toISOString().split("T")[0];
    const yestStr = getPreviousDate(todayStr);
    currentDates = [todayStr];
    previousDates = [yestStr];
  } else if (period === "month") {
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth(); // 0-indexed
    // current month so far (1 to today)
    for (let day = 1; day <= today.getUTCDate(); day++) {
      const d = new Date(Date.UTC(year, month, day));
      currentDates.push(d.toISOString().split("T")[0]);
    }
    // previous month equivalent days
    const prevMonthYear = month === 0 ? year - 1 : year;
    const prevMonth = month === 0 ? 11 : month - 1;
    for (let day = 1; day <= today.getUTCDate(); day++) {
      const d = new Date(Date.UTC(prevMonthYear, prevMonth, day));
      previousDates.push(d.toISOString().split("T")[0]);
    }
  } else {
    // Default: week (last 7 days vs previous 7 days)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
      currentDates.push(d.toISOString().split("T")[0]);
    }
    for (let i = 13; i >= 7; i--) {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
      previousDates.push(d.toISOString().split("T")[0]);
    }
  }

  async function aggregatePeriod(dates: string[]) {
    let focusMin = 0;
    let taskCount = 0;
    let taskDone = 0;
    let habitCount = 0;
    let habitDone = 0;
    let scoreSum = 0;
    let scoredDays = 0;

    for (const d of dates) {
      const m = await fetchDayMetrics(userId!, d, user!);
      focusMin += m.focusMinutes;
      taskCount += m.tasksTotal;
      taskDone += m.tasksCompleted;
      habitCount += m.habitsScheduled;
      habitDone += m.habitsCompleted;
      if (m.unifiedScore !== null) {
        scoreSum += m.unifiedScore;
        scoredDays += 1;
      }
    }

    const taskRate = taskCount > 0 ? Math.round((taskDone / taskCount) * 100) : 0;
    const habitRate = habitCount > 0 ? Math.round((habitDone / habitCount) * 100) : 0;
    const avgScore = scoredDays > 0 ? parseFloat((scoreSum / scoredDays).toFixed(1)) : 0;

    return {
      dates,
      totalFocusMinutes: focusMin,
      totalFocusHours: parseFloat((focusMin / 60).toFixed(1)),
      tasksCompleted: taskDone,
      tasksTotal: taskCount,
      taskCompletionRate: taskRate,
      habitsCompleted: habitDone,
      habitsScheduled: habitCount,
      habitConsistencyRate: habitRate,
      averageScore: avgScore,
      scoredDays,
    };
  }

  const current = await aggregatePeriod(currentDates);
  const previous = await aggregatePeriod(previousDates);

  const deltas = {
    scoreDelta: parseFloat((current.averageScore - previous.averageScore).toFixed(1)),
    focusHoursDelta: parseFloat((current.totalFocusHours - previous.totalFocusHours).toFixed(1)),
    taskCompletionDelta: current.taskCompletionRate - previous.taskCompletionRate,
    habitConsistencyDelta: current.habitConsistencyRate - previous.habitConsistencyRate,
  };

  res.status(200).json({
    success: true,
    period,
    current,
    previous,
    deltas,
  });
}
