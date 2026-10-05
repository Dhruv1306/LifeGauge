import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../types";
import { Priority } from "@prisma/client";

const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required").trim(),
  description: z.string().optional(),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  dueDate: z.string().datetime().optional().nullable(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).trim().optional(),
  description: z.string().optional().nullable(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  isCompleted: z.boolean().optional(),
});

export async function getTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const { status, priority, dueDate, search } = req.query;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId };

  if (status === "completed") {
    where.isCompleted = true;
  } else if (status === "active") {
    where.isCompleted = false;
  }

  if (priority && typeof priority === "string" && ["LOW", "MEDIUM", "HIGH"].includes(priority.toUpperCase())) {
    where.priority = priority.toUpperCase() as Priority;
  }

  if (dueDate && typeof dueDate === "string") {
    const start = new Date(dueDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(dueDate);
    end.setUTCHours(23, 59, 59, 999);
    where.dueDate = { gte: start, lte: end };
  }

  if (search && typeof search === "string" && search.trim() !== "") {
    where.OR = [
      { title: { contains: search.trim() } },
      { description: { contains: search.trim() } },
    ];
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [
      { isCompleted: "asc" },
      { dueDate: "asc" },
      { createdAt: "desc" },
    ],
  });

  res.status(200).json({
    success: true,
    count: tasks.length,
    tasks,
  });
}

export async function getTaskById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const taskId = req.params.id;

  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
  });

  if (!task) {
    res.status(404).json({ success: false, error: "Task not found." });
    return;
  }

  res.status(200).json({
    success: true,
    task,
  });
}

export async function createTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.errors[0]?.message || "Validation failed",
    });
    return;
  }

  const { title, description, priority, dueDate } = parsed.data;

  const task = await prisma.task.create({
    data: {
      userId,
      title,
      description: description || null,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });

  res.status(201).json({
    success: true,
    message: "Task created successfully",
    task,
  });
}

export async function updateTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const taskId = req.params.id;

  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.errors[0]?.message || "Validation failed",
    });
    return;
  }

  const existingTask = await prisma.task.findFirst({
    where: { id: taskId, userId },
  });

  if (!existingTask) {
    res.status(404).json({ success: false, error: "Task not found." });
    return;
  }

  const data = parsed.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;

  if (data.isCompleted !== undefined) {
    updateData.isCompleted = data.isCompleted;
    updateData.completedAt = data.isCompleted ? new Date() : null;
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
  });

  res.status(200).json({
    success: true,
    message: "Task updated successfully",
    task: updatedTask,
  });
}

export async function deleteTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const taskId = req.params.id;

  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const existingTask = await prisma.task.findFirst({
    where: { id: taskId, userId },
  });

  if (!existingTask) {
    res.status(404).json({ success: false, error: "Task not found." });
    return;
  }

  await prisma.task.delete({
    where: { id: taskId },
  });

  res.status(200).json({
    success: true,
    message: "Task deleted successfully",
  });
}
