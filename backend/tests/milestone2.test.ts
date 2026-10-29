import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../src/lib/prisma";
import * as taskController from "../src/controllers/taskController";
import * as habitController from "../src/controllers/habitController";
import * as timeEntryController from "../src/controllers/timeEntryController";
import { AuthenticatedRequest } from "../src/types";
import { Response } from "express";

// Mock Prisma
vi.mock("../src/lib/prisma", () => ({
  prisma: {
    task: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    habit: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    habitLog: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    timeEntry: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

function mockResponse() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("Milestone 2: Core Data Modules (Tasks, Habits/Matrix, Time Entries)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Tasks API Controller", () => {
    it("should list tasks scoped strictly to authenticated user", async () => {
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        query: { status: "active", priority: "HIGH" },
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      const mockTasks = [
        { id: "task-1", userId: "user-123", title: "Practice DSA", priority: "HIGH", isCompleted: false },
      ];
      vi.mocked(prisma.task.findMany).mockResolvedValue(mockTasks as never);

      await taskController.getTasks(req, res);

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "user-123",
            isCompleted: false,
            priority: "HIGH",
          }),
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: 1,
          tasks: mockTasks,
        })
      );
    });

    it("should create a new task with given priority and defaults", async () => {
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        body: {
          title: "Complete DSA Sheet",
          description: "Solve Graph problems",
          priority: "HIGH",
        },
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      const created = {
        id: "task-new",
        userId: "user-123",
        title: "Complete DSA Sheet",
        description: "Solve Graph problems",
        priority: "HIGH",
        isCompleted: false,
      };
      vi.mocked(prisma.task.create).mockResolvedValue(created as never);

      await taskController.createTask(req, res);

      expect(prisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-123",
          title: "Complete DSA Sheet",
          priority: "HIGH",
        }),
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("should accept null or empty string description and persist as null", async () => {
      const reqWithNull = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        body: {
          title: "Deploy project",
          description: null,
          priority: "LOW",
        },
      } as unknown as AuthenticatedRequest;
      const resWithNull = mockResponse();

      vi.mocked(prisma.task.create).mockResolvedValue({
        id: "task-null-desc",
        userId: "user-123",
        title: "Deploy project",
        description: null,
        priority: "LOW",
        isCompleted: false,
      } as never);

      await taskController.createTask(reqWithNull, resWithNull);

      expect(resWithNull.status).toHaveBeenCalledWith(201);
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-123",
          title: "Deploy project",
          description: null,
        }),
      });

      const reqWithEmpty = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        body: {
          title: "Deploy project 2",
          description: "   ",
          priority: "LOW",
        },
      } as unknown as AuthenticatedRequest;
      const resWithEmpty = mockResponse();

      await taskController.createTask(reqWithEmpty, resWithEmpty);

      expect(resWithEmpty.status).toHaveBeenCalledWith(201);
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-123",
          title: "Deploy project 2",
          description: null,
        }),
      });
    });

    it("should reject task creation if title is empty (400)", async () => {
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        body: { title: "", priority: "LOW" },
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      await taskController.createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(prisma.task.create).not.toHaveBeenCalled();
    });

    it("should update task title, description, and priority", async () => {
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        params: { id: "task-1" },
        body: { title: "Updated Title", description: "New details", priority: "HIGH" },
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      vi.mocked(prisma.task.findFirst).mockResolvedValue({ id: "task-1", userId: "user-123" } as never);
      vi.mocked(prisma.task.update).mockResolvedValue({
        id: "task-1",
        title: "Updated Title",
        description: "New details",
        priority: "HIGH",
      } as never);

      await taskController.updateTask(req, res);

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "task-1" },
          data: expect.objectContaining({
            title: "Updated Title",
            description: "New details",
            priority: "HIGH",
          }),
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should update task and toggle completion with completedAt timestamp", async () => {
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        params: { id: "task-1" },
        body: { isCompleted: true },
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      vi.mocked(prisma.task.findFirst).mockResolvedValue({ id: "task-1", userId: "user-123" } as never);
      vi.mocked(prisma.task.update).mockResolvedValue({ id: "task-1", isCompleted: true, completedAt: new Date() } as never);

      await taskController.updateTask(req, res);

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "task-1" },
          data: expect.objectContaining({
            isCompleted: true,
            completedAt: expect.any(Date),
          }),
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 404 when deleting a task that does not belong to the user", async () => {
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        params: { id: "task-other" },
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      vi.mocked(prisma.task.findFirst).mockResolvedValue(null);

      await taskController.deleteTask(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(prisma.task.delete).not.toHaveBeenCalled();
    });
  });

  describe("Habits & Habit Matrix Controller", () => {
    it("should create a habit with targetDays definition", async () => {
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        body: { title: "Wake up at 6 AM", targetDays: "MON,TUE,WED,THU,FRI" },
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      vi.mocked(prisma.habit.create).mockResolvedValue({
        id: "habit-1",
        userId: "user-123",
        title: "Wake up at 6 AM",
        targetDays: "MON,TUE,WED,THU,FRI",
      } as never);

      await habitController.createHabit(req, res);

      expect(prisma.habit.create).toHaveBeenCalledWith({
        data: {
          userId: "user-123",
          title: "Wake up at 6 AM",
          targetDays: "MON,TUE,WED,THU,FRI",
        },
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("should update habit title, targetDays, and isActive", async () => {
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        params: { id: "habit-1" },
        body: { title: "Morning Run", targetDays: "ALL", isActive: true },
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      vi.mocked(prisma.habit.findFirst).mockResolvedValue({
        id: "habit-1",
        userId: "user-123",
        title: "Old Habit",
        targetDays: "MON,FRI",
        isActive: false,
      } as never);

      vi.mocked(prisma.habit.update).mockResolvedValue({
        id: "habit-1",
        userId: "user-123",
        title: "Morning Run",
        targetDays: "ALL",
        isActive: true,
      } as never);

      await habitController.updateHabit(req, res);

      expect(prisma.habit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "habit-1" },
          data: expect.objectContaining({
            title: "Morning Run",
            targetDays: "ALL",
            isActive: true,
          }),
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should toggle habit completion for a specific date", async () => {
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        params: { id: "habit-1" },
        body: { date: "2026-10-05" },
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      vi.mocked(prisma.habit.findFirst).mockResolvedValue({ id: "habit-1", userId: "user-123" } as never);
      vi.mocked(prisma.habitLog.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.habitLog.create).mockResolvedValue({
        id: "log-1",
        habitId: "habit-1",
        date: "2026-10-05",
        isCompleted: true,
      } as never);

      await habitController.toggleHabit(req, res);

      expect(prisma.habitLog.create).toHaveBeenCalledWith({
        data: {
          habitId: "habit-1",
          date: "2026-10-05",
          isCompleted: true,
        },
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should generate 2D punchcard matrix data with consistency rate", async () => {
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        query: { startDate: "2026-10-01", endDate: "2026-10-03" },
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      // 2026-10-01 is Thursday (THU), 10-02 is Friday (FRI), 10-03 is Saturday (SAT)
      const mockHabits = [
        {
          id: "habit-1",
          title: "DSA Practice",
          targetDays: "ALL",
          logs: [
            { date: "2026-10-01", isCompleted: true },
            { date: "2026-10-02", isCompleted: true },
          ],
        },
      ];
      vi.mocked(prisma.habit.findMany).mockResolvedValue(mockHabits as never);

      await habitController.getHabitMatrix(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonResponse = vi.mocked(res.json).mock.calls[0][0];

      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.dates).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
      expect(jsonResponse.habits[0].days["2026-10-01"]).toEqual({ scheduled: true, completed: true });
      expect(jsonResponse.habits[0].days["2026-10-02"]).toEqual({ scheduled: true, completed: true });
      expect(jsonResponse.habits[0].days["2026-10-03"]).toEqual({ scheduled: true, completed: false });
      expect(jsonResponse.summary.totalScheduled).toBe(3);
      expect(jsonResponse.summary.totalCompleted).toBe(2);
      expect(jsonResponse.summary.consistencyRate).toBe(67);
    });
  });

  describe("Time Entries & Time Blocking Controller", () => {
    it("should record a manual time block with category and duration", async () => {
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        body: {
          date: "2026-10-05",
          category: "DSA Practice",
          durationMin: 90,
          startTime: "14:00",
          endTime: "15:30",
          description: "Binary Trees & LeetCode problems",
        },
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      const created = {
        id: "time-1",
        userId: "user-123",
        date: "2026-10-05",
        category: "DSA Practice",
        durationMin: 90,
      };
      vi.mocked(prisma.timeEntry.create).mockResolvedValue(created as never);

      await timeEntryController.createTimeEntry(req, res);

      expect(prisma.timeEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-123",
          category: "DSA Practice",
          durationMin: 90,
          startTime: "14:00",
          endTime: "15:30",
        }),
        include: expect.any(Object),
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("should compute category time distribution and hours summary", async () => {
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        query: { startDate: "2026-10-01", endDate: "2026-10-05" },
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      const mockEntries = [
        { category: "DSA", durationMin: 120 },
        { category: "DSA", durationMin: 60 },
        { category: "Web Dev", durationMin: 60 },
      ];
      vi.mocked(prisma.timeEntry.findMany).mockResolvedValue(mockEntries as never);

      await timeEntryController.getTimeSummary(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const json = vi.mocked(res.json).mock.calls[0][0];

      expect(json.success).toBe(true);
      expect(json.totalMinutes).toBe(240); // 4 hours
      expect(json.totalHours).toBe(4.0);
      // DSA: 180 min (75%), Web Dev: 60 min (25%)
      const dsa = json.distribution.find((d: { category: string }) => d.category === "DSA");
      const dev = json.distribution.find((d: { category: string }) => d.category === "Web Dev");
      expect(dsa.minutes).toBe(180);
      expect(dsa.hours).toBe(3.0);
      expect(dsa.percentage).toBe(75);
      expect(dev.minutes).toBe(60);
      expect(dev.hours).toBe(1.0);
      expect(dev.percentage).toBe(25);
    });

    it("should prevent updating a time entry belonging to another user (tenant isolation)", async () => {
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        params: { id: "entry-other" },
        body: { durationMin: 45 },
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      vi.mocked(prisma.timeEntry.findFirst).mockResolvedValue(null);

      await timeEntryController.updateTimeEntry(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(prisma.timeEntry.update).not.toHaveBeenCalled();
    });
  });
});
