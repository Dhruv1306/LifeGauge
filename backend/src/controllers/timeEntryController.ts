import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../types";
import { cleanupExpiredFocusSessions } from "../services/focusSessionCleanup";

const createTimeEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  name: z.string().min(1, "Name is required").trim().default("Focus Session"),
  category: z.string().min(1, "Category is required").trim(),
  durationMin: z.number().int().min(1, "Duration must be at least 1 minute"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Start time must be HH:MM").optional().nullable(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "End time must be HH:MM").optional().nullable(),
  taskId: z.string().uuid("Invalid task ID format").optional().nullable(),
});

const updateTimeEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
  name: z.string().min(1).trim().optional(),
  category: z.string().min(1).trim().optional(),
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
  const rankedEntries = await prisma.timeEntry.findMany({
    where: { userId },
    select: { id: true },
    orderBy: [{ durationMin: "desc" }, { date: "desc" }, { createdAt: "asc" }],
    take: 3,
  });
  const rankById = new Map(
    (Array.isArray(rankedEntries) ? rankedEntries : []).map((entry, index) => [
      entry.id,
      index + 1,
    ]),
  );

  res.status(200).json({
    success: true,
    count: entries.length,
    entries: entries.map((entry) => ({
      ...entry,
      rank: rankById.get(entry.id) || null,
    })),
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

  const { date, name, category, durationMin, startTime, endTime, taskId } = parsed.data;

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

  const previousTopEntries = await prisma.timeEntry.findMany({
    where: { userId },
    select: { id: true, name: true, isPinned: true },
    orderBy: [{ durationMin: "desc" }, { date: "desc" }, { createdAt: "asc" }],
    take: 3,
  });

  const entry = await prisma.timeEntry.create({
    data: {
      userId,
      date,
      name,
      category,
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
  const currentTopEntries = await prisma.timeEntry.findMany({
    where: { userId },
    select: { id: true, name: true },
    orderBy: [{ durationMin: "desc" }, { date: "desc" }, { createdAt: "asc" }],
    take: 3,
  });
  const safeCurrentTopEntries = Array.isArray(currentTopEntries) ? currentTopEntries : [];
  const safePreviousTopEntries = Array.isArray(previousTopEntries) ? previousTopEntries : [];
  const newRank = safeCurrentTopEntries.findIndex((topEntry) => topEntry.id === entry.id) + 1;
  const previousRank = safePreviousTopEntries.findIndex((topEntry) => topEntry.id === entry.id) + 1;
  const displacedEntry = newRank > 0 ? safePreviousTopEntries[newRank - 1] : undefined;

  if (process.env.NODE_ENV !== "test") {
    await cleanupExpiredFocusSessions().catch((error) => {
      console.error("[FocusSessionCleanup] Cleanup after create failed:", error);
    });
  }

  res.status(201).json({
    success: true,
    message: "Time entry recorded successfully",
    entry,
    promotionMessage:
      newRank > 0 && (previousRank === 0 || newRank < previousRank)
        ? displacedEntry
          ? `${name} is now at ${newRank} place and surpassed your previous ${displacedEntry.name}`
          : `${name} is now at ${newRank} place.`
        : null,
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
    select: { id: true, isPinned: true },
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
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
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
  if (process.env.NODE_ENV !== "test") {
    await cleanupExpiredFocusSessions().catch((error) => {
      console.error("[FocusSessionCleanup] Cleanup after update failed:", error);
    });
  }

  res.status(200).json({
    success: true,
    message: "Time entry updated successfully",
    entry: updatedEntry,
  });
}

export async function toggleTimeEntryPin(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const entryId = req.params.id;

  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const entry = await prisma.timeEntry.findFirst({
    where: { id: entryId, userId },
    select: { id: true, name: true, isPinned: true },
  });

  if (!entry) {
    res.status(404).json({ success: false, error: "Time entry not found." });
    return;
  }

  const updatedEntry = await prisma.timeEntry.update({
    where: { id: entryId },
    data: { isPinned: !entry.isPinned },
    select: { id: true, name: true, isPinned: true },
  });

  res.status(200).json({
    success: true,
    message: updatedEntry.isPinned
      ? `"${updatedEntry.name}" pinned.`
      : `"${updatedEntry.name}" unpinned.`,
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
