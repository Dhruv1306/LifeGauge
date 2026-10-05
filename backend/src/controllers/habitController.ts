import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../types";

const DAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
type DayCode = typeof DAY_CODES[number];

const createHabitSchema = z.object({
  title: z.string().min(1, "Habit title is required").trim(),
  targetDays: z.string().default("ALL"), // e.g. "MON,TUE,WED,THU,FRI" or "ALL"
});

const updateHabitSchema = z.object({
  title: z.string().min(1).trim().optional(),
  targetDays: z.string().optional(),
  isActive: z.boolean().optional(),
});

const toggleHabitSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
});

function getDayCode(dateStr: string): DayCode {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return DAY_CODES[date.getUTCDay()];
}

function isHabitScheduledForDay(targetDays: string, dayCode: DayCode): boolean {
  if (!targetDays || targetDays.toUpperCase() === "ALL") return true;
  const days = targetDays.toUpperCase().split(",").map((d) => d.trim());
  return days.includes(dayCode);
}

function generateDateRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const [sy, sm, sd] = startStr.split("-").map(Number);
  const [ey, em, ed] = endStr.split("-").map(Number);

  const current = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));

  while (current <= end) {
    const y = current.getUTCFullYear();
    const m = String(current.getUTCMonth() + 1).padStart(2, "0");
    const d = String(current.getUTCDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

export async function getHabits(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const habits = await prisma.habit.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  res.status(200).json({
    success: true,
    count: habits.length,
    habits,
  });
}

export async function createHabit(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const parsed = createHabitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.errors[0]?.message || "Validation failed",
    });
    return;
  }

  const { title, targetDays } = parsed.data;

  const habit = await prisma.habit.create({
    data: {
      userId,
      title,
      targetDays: targetDays.toUpperCase(),
    },
  });

  res.status(201).json({
    success: true,
    message: "Habit created successfully",
    habit,
  });
}

export async function updateHabit(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const habitId = req.params.id;

  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const parsed = updateHabitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.errors[0]?.message || "Validation failed",
    });
    return;
  }

  const existingHabit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
  });

  if (!existingHabit) {
    res.status(404).json({ success: false, error: "Habit not found." });
    return;
  }

  const updatedHabit = await prisma.habit.update({
    where: { id: habitId },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.targetDays !== undefined ? { targetDays: parsed.data.targetDays.toUpperCase() } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
    },
  });

  res.status(200).json({
    success: true,
    message: "Habit updated successfully",
    habit: updatedHabit,
  });
}

export async function deleteHabit(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const habitId = req.params.id;

  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const existingHabit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
  });

  if (!existingHabit) {
    res.status(404).json({ success: false, error: "Habit not found." });
    return;
  }

  await prisma.habit.delete({
    where: { id: habitId },
  });

  res.status(200).json({
    success: true,
    message: "Habit deleted successfully",
  });
}

export async function toggleHabit(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const habitId = req.params.id;

  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const parsed = toggleHabitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.errors[0]?.message || "Invalid date format. Expected YYYY-MM-DD",
    });
    return;
  }

  const { date } = parsed.data;

  // Verify habit ownership
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
  });

  if (!habit) {
    res.status(404).json({ success: false, error: "Habit not found." });
    return;
  }

  const existingLog = await prisma.habitLog.findUnique({
    where: {
      habitId_date: {
        habitId,
        date,
      },
    },
  });

  let habitLog;
  if (existingLog) {
    habitLog = await prisma.habitLog.update({
      where: { id: existingLog.id },
      data: { isCompleted: !existingLog.isCompleted },
    });
  } else {
    habitLog = await prisma.habitLog.create({
      data: {
        habitId,
        date,
        isCompleted: true,
      },
    });
  }

  res.status(200).json({
    success: true,
    message: `Habit ${habitLog.isCompleted ? "marked as completed" : "uncompleted"} for ${date}`,
    habitLog,
  });
}

export async function getHabitMatrix(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const today = new Date();
  const defaultEnd = today.toISOString().split("T")[0];
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setUTCDate(today.getUTCDate() - 13);
  const defaultStart = fourteenDaysAgo.toISOString().split("T")[0];

  const startDate = (req.query.startDate as string) || defaultStart;
  const endDate = (req.query.endDate as string) || defaultEnd;

  const dates = generateDateRange(startDate, endDate);

  const habits = await prisma.habit.findMany({
    where: { userId, isActive: true },
    include: {
      logs: {
        where: {
          date: { in: dates },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  let totalScheduled = 0;
  let totalCompleted = 0;

  const matrix = habits.map((habit) => {
    const logMap = new Map(habit.logs.map((log) => [log.date, log.isCompleted]));
    const days: Record<string, { scheduled: boolean; completed: boolean }> = {};

    for (const date of dates) {
      const dayCode = getDayCode(date);
      const scheduled = isHabitScheduledForDay(habit.targetDays, dayCode);
      const completed = !!logMap.get(date);

      if (scheduled) {
        totalScheduled += 1;
        if (completed) {
          totalCompleted += 1;
        }
      }

      days[date] = { scheduled, completed };
    }

    return {
      id: habit.id,
      title: habit.title,
      targetDays: habit.targetDays,
      days,
    };
  });

  const consistencyRate =
    totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 100;

  res.status(200).json({
    success: true,
    startDate,
    endDate,
    dates,
    habits: matrix,
    summary: {
      totalScheduled,
      totalCompleted,
      consistencyRate,
    },
  });
}
