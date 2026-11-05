import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../types";

const DAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
type DayCode = typeof DAY_CODES[number];

const createHabitSchema = z.object({
  title: z.string().min(1, "Habit title is required").trim(),
  targetDays: z.string().default("ALL"), // e.g. "MON,TUE,WED,THU,FRI" or "ALL"
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format").optional().nullable(),
  order: z.number().int().optional(),
});

const updateHabitSchema = z.object({
  title: z.string().min(1).trim().optional(),
  targetDays: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format").optional().nullable(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const reorderHabitsSchema = z.object({
  habitIds: z.array(z.string().min(1)).min(1, "At least one habit ID is required"),
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

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function getMonthName(monthNumber: number): string {
  return MONTH_NAMES[monthNumber - 1] || "";
}

function getMonthDateRange(
  year: number,
  month: number
): { startDate: string; endDate: string } {
  const y = String(year);
  const m = String(month).padStart(2, "0");
  const startDate = `${y}-${m}-01`;
  // Date.UTC(year, month, 0) gives the last day of month 'month' (1-indexed)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endDate = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

function formatDateReadable(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const monthName = getMonthName(month);
  return `${monthName} ${day}, ${year}`;
}

export async function getHabits(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const habits = await prisma.habit.findMany({
    where: { userId, isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
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

  const { title, targetDays, startDate, order } = parsed.data;

  let assignedOrder = order;
  if (assignedOrder === undefined) {
    const maxOrderHabit = await prisma.habit.findFirst({
      where: { userId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    assignedOrder = (maxOrderHabit?.order ?? -1) + 1;
  }

  const assignedStartDate = startDate || new Date().toISOString().split("T")[0];

  const habit = await prisma.habit.create({
    data: {
      userId,
      title,
      targetDays: targetDays.toUpperCase(),
      startDate: assignedStartDate,
      order: assignedOrder,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.targetDays !== undefined) updateData.targetDays = parsed.data.targetDays.toUpperCase();
  if (parsed.data.startDate !== undefined) updateData.startDate = parsed.data.startDate;
  if (parsed.data.order !== undefined) updateData.order = parsed.data.order;
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

  const updatedHabit = await prisma.habit.update({
    where: { id: habitId },
    data: updateData,
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

  // Cannot log habits for future dates
  const todayStr = new Date().toISOString().split("T")[0];
  if (date > todayStr) {
    res.status(400).json({
      success: false,
      error: "Cannot log habits for future dates.",
    });
    return;
  }

  // Cannot log habits prior to user registration date
  try {
    const user = await prisma.user?.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });
    if (user?.createdAt) {
      const regDateStr = new Date(user.createdAt).toISOString().split("T")[0];
      if (date < regDateStr) {
        res.status(400).json({
          success: false,
          error: "Cannot log habits prior to your account registration date.",
        });
        return;
      }
    }
  } catch (err) {
    console.error("[toggleHabit] error checking registration date:", err);
  }

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

export async function reorderHabits(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const parsed = reorderHabitsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.errors[0]?.message || "Validation failed",
    });
    return;
  }

  const { habitIds } = parsed.data;

  // Verify all habit IDs belong to the current user
  const userHabits = await prisma.habit.findMany({
    where: {
      id: { in: habitIds },
      userId,
    },
    select: { id: true },
  });

  if (userHabits.length !== habitIds.length) {
    res.status(400).json({
      success: false,
      error: "One or more habit IDs are invalid or do not belong to you.",
    });
    return;
  }

  // Update order within a transaction
  await prisma.$transaction(
    habitIds.map((id, index) =>
      prisma.habit.update({
        where: { id },
        data: { order: index },
      })
    )
  );

  res.status(200).json({
    success: true,
    message: "Habits reordered successfully",
  });
}

export async function getHabitMatrix(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  // Retrieve user registration date
  let registrationDate = "1970-01-01";
  try {
    const user = await prisma.user?.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });
    if (user?.createdAt) {
      registrationDate = new Date(user.createdAt).toISOString().split("T")[0];
    }
  } catch (err) {
    console.error("[getHabitMatrix] error checking registration date:", err);
  }

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  let startDate: string;
  let endDate: string;
  let selectedYear: number | undefined;
  let selectedMonth: number | undefined;

  const queryMonth = req.query.month as string | undefined;
  const queryYear = req.query.year as string | undefined;

  if (queryYear && queryMonth) {
    const y = parseInt(queryYear, 10);
    const m = parseInt(queryMonth, 10);
    if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
      selectedYear = y;
      selectedMonth = m;
      const range = getMonthDateRange(y, m);
      startDate = range.startDate;
      endDate = range.endDate;
    } else {
      res.status(400).json({ success: false, error: "Invalid year or month parameter." });
      return;
    }
  } else if (queryMonth && queryMonth.includes("-")) {
    const [yStr, mStr] = queryMonth.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
      selectedYear = y;
      selectedMonth = m;
      const range = getMonthDateRange(y, m);
      startDate = range.startDate;
      endDate = range.endDate;
    } else {
      res.status(400).json({ success: false, error: "Invalid month format. Expected YYYY-MM." });
      return;
    }
  } else {
    const defaultEnd = todayStr;
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setUTCDate(today.getUTCDate() - 13);
    const defaultStart = fourteenDaysAgo.toISOString().split("T")[0];

    startDate = (req.query.startDate as string) || defaultStart;
    endDate = (req.query.endDate as string) || defaultEnd;
  }

  // Pre-registration check:
  // If the entire requested window ends BEFORE the user registered
  if (endDate < registrationDate) {
    const monthName = selectedMonth ? getMonthName(selectedMonth) : "the requested period";
    const yearLabel = selectedYear ? ` ${selectedYear}` : "";
    const regReadable = formatDateReadable(registrationDate);
    const periodLabel = selectedMonth && selectedYear ? `${monthName}${yearLabel}` : "this period";

    res.status(200).json({
      success: true,
      isPreRegistration: true,
      registrationDate,
      message: `You don't have any Matrix data for ${periodLabel} because your account was registered on ${regReadable}. You can view your Matrix records starting from your registration date.`,
      startDate,
      endDate,
      dates: [],
      habits: [],
      summary: {
        totalScheduled: 0,
        totalCompleted: 0,
        consistencyRate: 100,
      },
    });
    return;
  }

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
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  let totalScheduled = 0;
  let totalCompleted = 0;

  const matrix = habits.map((habit) => {
    const logMap = new Map(habit.logs.map((log) => [log.date, log.isCompleted]));
    const days: Record<
      string,
      { scheduled: boolean; completed: boolean; isFuture?: boolean; outsideTracking?: boolean }
    > = {};

    for (const date of dates) {
      const dayCode = getDayCode(date);
      const isBeforeReg = date < registrationDate;
      const isFutureDate = date > todayStr;

      let scheduled = false;
      let completed = false;

      if (isBeforeReg) {
        // Outside tracking period: NOT scheduled, NOT missed
        scheduled = false;
        completed = false;
      } else if (isFutureDate) {
        // Future date: Unscheduled, NOT missed
        scheduled = false;
        completed = false;
      } else {
        // Active tracking period
        const isBeforeStart = habit.startDate ? date < habit.startDate : false;
        scheduled = !isBeforeStart && isHabitScheduledForDay(habit.targetDays, dayCode);
        completed = !!logMap.get(date);

        if (scheduled) {
          totalScheduled += 1;
          if (completed) {
            totalCompleted += 1;
          }
        }
      }

      const dayState: { scheduled: boolean; completed: boolean; isFuture?: boolean; outsideTracking?: boolean } = {
        scheduled,
        completed,
      };
      if (isFutureDate) {
        dayState.isFuture = true;
      }
      if (isBeforeReg) {
        dayState.outsideTracking = true;
      }

      days[date] = dayState;
    }

    return {
      id: habit.id,
      title: habit.title,
      targetDays: habit.targetDays,
      startDate: habit.startDate,
      order: habit.order,
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
    registrationDate,
    isPreRegistration: false,
    habits: matrix,
    summary: {
      totalScheduled,
      totalCompleted,
      consistencyRate,
    },
  });
}

