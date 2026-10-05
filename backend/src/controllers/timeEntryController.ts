import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../types";

const createTimeEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  category: z.string().min(1, "Category is required").trim(),
  description: z.string().optional().nullable(),
  durationMin: z.number().int().min(1, "Duration must be at least 1 minute"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Start time must be HH:MM").optional().nullable(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "End time must be HH:MM").optional().nullable(),
  taskId: z.string().uuid("Invalid task ID format").optional().nullable(),
});

const updateTimeEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
  category: z.string().min(1).trim().optional(),
  description: z.string().optional().nullable(),
  durationMin: z.number().int().min(1).optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  taskId: z.string().uuid().optional().nullable(),
});

export async function getTimeEntries(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const { startDate, endDate, category, taskId } = req.query;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId };

  if (startDate && endDate) {
    where.date = {
      gte: String(startDate),
      lte: String(endDate),
    };
  } else if (startDate) {
    where.date = { gte: String(startDate) };
  } else if (endDate) {
    where.date = { lte: String(endDate) };
  }

  if (category && typeof category === "string") {
    where.category = category;
  }

  if (taskId && typeof taskId === "string") {
    where.taskId = taskId;
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    include: {
      task: {
        select: {
          id: true,
          title: true,
          priority: true,
        },
      },
    },
    orderBy: [
      { date: "desc" },
      { createdAt: "desc" },
    ],
  });

  res.status(200).json({
    success: true,
    count: entries.length,
    entries,
  });
}

export async function createTimeEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const parsed = createTimeEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.errors[0]?.message || "Validation failed",
    });
    return;
  }

  const { date, category, description, durationMin, startTime, endTime, taskId } = parsed.data;

  // If taskId provided, verify ownership
  if (taskId) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId },
    });
    if (!task) {
      res.status(400).json({
        success: false,
        error: "Referenced task does not exist or does not belong to you.",
      });
      return;
    }
  }

  const entry = await prisma.timeEntry.create({
    data: {
      userId,
      date,
      category,
      description: description || null,
      durationMin,
      startTime: startTime || null,
      endTime: endTime || null,
      taskId: taskId || null,
    },
    include: {
      task: {
        select: { id: true, title: true, priority: true },
      },
    },
  });

  res.status(201).json({
    success: true,
    message: "Time entry recorded successfully",
    entry,
  });
}

export async function updateTimeEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const entryId = req.params.id;

  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const parsed = updateTimeEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.errors[0]?.message || "Validation failed",
    });
    return;
  }

  const existingEntry = await prisma.timeEntry.findFirst({
    where: { id: entryId, userId },
  });

  if (!existingEntry) {
    res.status(404).json({ success: false, error: "Time entry not found." });
    return;
  }

  const data = parsed.data;

  if (data.taskId) {
    const task = await prisma.task.findFirst({
      where: { id: data.taskId, userId },
    });
    if (!task) {
      res.status(400).json({
        success: false,
        error: "Referenced task does not exist or does not belong to you.",
      });
      return;
    }
  }

  const updatedEntry = await prisma.timeEntry.update({
    where: { id: entryId },
    data: {
      ...(data.date !== undefined ? { date: data.date } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.durationMin !== undefined ? { durationMin: data.durationMin } : {}),
      ...(data.startTime !== undefined ? { startTime: data.startTime } : {}),
      ...(data.endTime !== undefined ? { endTime: data.endTime } : {}),
      ...(data.taskId !== undefined ? { taskId: data.taskId } : {}),
    },
    include: {
      task: {
        select: { id: true, title: true, priority: true },
      },
    },
  });

  res.status(200).json({
    success: true,
    message: "Time entry updated successfully",
    entry: updatedEntry,
  });
}

export async function deleteTimeEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const entryId = req.params.id;

  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const existingEntry = await prisma.timeEntry.findFirst({
    where: { id: entryId, userId },
  });

  if (!existingEntry) {
    res.status(404).json({ success: false, error: "Time entry not found." });
    return;
  }

  await prisma.timeEntry.delete({
    where: { id: entryId },
  });

  res.status(200).json({
    success: true,
    message: "Time entry deleted successfully",
  });
}

export async function getTimeSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const { startDate, endDate } = req.query;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId };
  if (startDate && endDate) {
    where.date = { gte: String(startDate), lte: String(endDate) };
  } else if (startDate) {
    where.date = { gte: String(startDate) };
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    select: { category: true, durationMin: true },
  });

  const categoryTotals: Record<string, number> = {};
  let totalMinutes = 0;

  for (const entry of entries) {
    categoryTotals[entry.category] = (categoryTotals[entry.category] || 0) + entry.durationMin;
    totalMinutes += entry.durationMin;
  }

  const distribution = Object.entries(categoryTotals).map(([category, minutes]) => ({
    category,
    minutes,
    hours: parseFloat((minutes / 60).toFixed(1)),
    percentage: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0,
  }));

  res.status(200).json({
    success: true,
    totalMinutes,
    totalHours: parseFloat((totalMinutes / 60).toFixed(1)),
    distribution,
  });
}
