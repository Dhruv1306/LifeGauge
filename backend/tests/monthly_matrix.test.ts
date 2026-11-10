import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../src/lib/prisma";
import * as habitController from "../src/controllers/habitController";
import { AuthenticatedRequest } from "../src/types";
import { Response } from "express";

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn((promises) => Promise.all(promises)),
    user: {
      findUnique: vi.fn(),
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
  },
}));

function mockResponse() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("Feature: Monthly Matrix View with Historical Month & Year Selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Monthly Date Calculation & Leap Year Handling", () => {
    it("should correctly generate 29 days for leap year February (e.g. Feb 2028)", async () => {
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        query: { year: "2028", month: "2" },
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      // User registered in 2025
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-123",
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
      } as any);

      vi.mocked(prisma.habit.findMany).mockResolvedValue([
        {
          id: "h1",
          title: "Exercise",
          targetDays: "ALL",
          startDate: "2025-01-01",
          order: 0,
          logs: [],
        },
      ] as any);

      await habitController.getHabitMatrix(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const data = vi.mocked(res.json).mock.calls[0][0];

      expect(data.success).toBe(true);
      expect(data.startDate).toBe("2028-02-01");
      expect(data.endDate).toBe("2028-02-29");
      expect(data.dates.length).toBe(29);
      expect(data.dates[0]).toBe("2028-02-01");
      expect(data.dates[28]).toBe("2028-02-29");
    });

    it("should correctly generate 31 days for October 2026", async () => {
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        query: { month: "2026-10" },
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-123",
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
      } as any);

      vi.mocked(prisma.habit.findMany).mockResolvedValue([
        {
          id: "h1",
          title: "Study",
          targetDays: "ALL",
          startDate: "2025-01-01",
          order: 0,
          logs: [],
        },
      ] as any);

      await habitController.getHabitMatrix(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const data = vi.mocked(res.json).mock.calls[0][0];

      expect(data.success).toBe(true);
      expect(data.startDate).toBe("2026-10-01");
      expect(data.endDate).toBe("2026-10-31");
      expect(data.dates.length).toBe(31);
      expect(data.dates[0]).toBe("2026-10-01");
      expect(data.dates[30]).toBe("2026-10-31");
    });

    it("should reject invalid month numbers with 400", async () => {
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        query: { year: "2026", month: "13" },
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      await habitController.getHabitMatrix(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const data = vi.mocked(res.json).mock.calls[0][0];
      expect(data.success).toBe(false);
      expect(data.error).toContain("Invalid year or month");
    });
  });

  describe("Registration Date Validation (Critical Business Rule)", () => {
    it("should return isPreRegistration=true and expose 0 records when requested month ends before registration", async () => {
      // User registered on February 15, 2026
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        query: { year: "2026", month: "1" }, // January 2026
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-123",
        createdAt: new Date("2026-02-15T10:00:00.000Z"),
      } as any);

      await habitController.getHabitMatrix(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const data = vi.mocked(res.json).mock.calls[0][0];

      expect(data.success).toBe(true);
      expect(data.isPreRegistration).toBe(true);
      expect(data.registrationDate).toBe("2026-02-15");
      expect(data.dates).toEqual([]);
      expect(data.habits).toEqual([]);
      expect(data.message).toContain("registered on February 15, 2026");
      expect(data.message).toContain("January 2026");

      // Verify DB habit queries were never executed
      expect(prisma.habit.findMany).not.toHaveBeenCalled();
    });

    it("should handle partial registration month: mark pre-registration days outsideTracking and exclude from totalScheduled", async () => {
      // User registered on 2026-02-15
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        query: { year: "2026", month: "2" }, // February 2026
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-123",
        createdAt: new Date("2026-02-15T00:00:00.000Z"),
      } as any);

      vi.mocked(prisma.habit.findMany).mockResolvedValue([
        {
          id: "h1",
          title: "Morning Run",
          targetDays: "ALL",
          startDate: "2026-02-15",
          order: 0,
          logs: [
            { date: "2026-02-15", isCompleted: true },
            { date: "2026-02-16", isCompleted: true },
          ],
        },
      ] as any);

      await habitController.getHabitMatrix(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const data = vi.mocked(res.json).mock.calls[0][0];

      expect(data.success).toBe(true);
      expect(data.isPreRegistration).toBe(false);
      expect(data.dates.length).toBe(28); // Feb 2026 non-leap

      const habitDays = data.habits[0].days;

      // Feb 1 to Feb 14 must be outside tracking period
      expect(habitDays["2026-02-01"].outsideTracking).toBe(true);
      expect(habitDays["2026-02-01"].scheduled).toBe(false);
      expect(habitDays["2026-02-14"].outsideTracking).toBe(true);
      expect(habitDays["2026-02-14"].scheduled).toBe(false);

      // Feb 15 onwards is within tracking period
      expect(habitDays["2026-02-15"].outsideTracking).toBeUndefined();
      expect(habitDays["2026-02-15"].scheduled).toBe(true);
      expect(habitDays["2026-02-15"].completed).toBe(true);

      expect(habitDays["2026-02-16"].outsideTracking).toBeUndefined();
      expect(habitDays["2026-02-16"].scheduled).toBe(true);
      expect(habitDays["2026-02-16"].completed).toBe(true);

      // Pre-registration days (14 days) must NOT be counted in totalScheduled
      // In 28-day Feb with registration on day 15, there are 14 tracked days (15 to 28)
      expect(data.summary.totalScheduled).toBe(14);
      expect(data.summary.totalCompleted).toBe(2);
    });
  });

  describe("Future Dates Handling", () => {
    it("should mark dates in the future as isFuture=true, unscheduled, and exclude from totalScheduled", async () => {
      const today = new Date();
      const currentYear = today.getUTCFullYear();
      const currentMonth = today.getUTCMonth() + 1;

      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        query: { year: String(currentYear), month: String(currentMonth) },
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      // Registered 1 year ago
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-123",
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
      } as any);

      vi.mocked(prisma.habit.findMany).mockResolvedValue([
        {
          id: "h1",
          title: "Daily Journal",
          targetDays: "ALL",
          startDate: "2024-01-01",
          order: 0,
          logs: [],
        },
      ] as any);

      await habitController.getHabitMatrix(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const data = vi.mocked(res.json).mock.calls[0][0];

      const todayStr = today.toISOString().split("T")[0];
      const habitDays = data.habits[0].days;

      // Check all dates in current month
      for (const d of data.dates) {
        if (d > todayStr) {
          expect(habitDays[d].isFuture).toBe(true);
          expect(habitDays[d].scheduled).toBe(false);
          expect(habitDays[d].completed).toBe(false);
        }
      }
    });
  });

  describe("Backend Security & Authorization", () => {
    it("should block toggleHabit for future dates", async () => {
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        params: { id: "h1" },
        body: { date: "2099-12-31" },
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      await habitController.toggleHabit(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const data = vi.mocked(res.json).mock.calls[0][0];
      expect(data.success).toBe(false);
      expect(data.error).toContain("future");
      expect(prisma.habitLog.create).not.toHaveBeenCalled();
    });

    it("should block toggleHabit for dates prior to user registration", async () => {
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        params: { id: "h1" },
        body: { date: "2026-01-10" },
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      // Registered Feb 15, 2026
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-123",
        createdAt: new Date("2026-02-15T00:00:00.000Z"),
      } as any);

      await habitController.toggleHabit(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const data = vi.mocked(res.json).mock.calls[0][0];
      expect(data.success).toBe(false);
      expect(data.error).toContain("registration");
      expect(prisma.habitLog.create).not.toHaveBeenCalled();
    });
  });

  describe("Finishing Date (endDate) Lifecycle & Matrix Visibility", () => {
    it("should keep habit visible in matrix for its stopping month and mark days after endDate as outsideTracking", async () => {
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        query: { year: "2026", month: "10" },
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-123",
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
      } as any);

      vi.mocked(prisma.habit.findMany).mockResolvedValue([
        {
          id: "h-stopped",
          title: "Read a Book",
          targetDays: "ALL",
          startDate: "2026-08-01",
          endDate: "2026-10-08",
          order: 0,
          logs: [
            { id: "log-1", habitId: "h-stopped", date: "2026-10-02", isCompleted: true },
          ],
        },
      ] as any);

      await habitController.getHabitMatrix(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const data = vi.mocked(res.json).mock.calls[0][0];

      // Habit should be visible in October 2026
      expect(data.habits.length).toBe(1);
      const stoppedHabit = data.habits[0];
      expect(stoppedHabit.title).toBe("Read a Book");
      expect(stoppedHabit.endDate).toBe("2026-10-08");

      // Before or on Oct 8: tracked normally
      expect(stoppedHabit.days["2026-10-02"].scheduled).toBe(true);
      expect(stoppedHabit.days["2026-10-02"].completed).toBe(true);
      expect(stoppedHabit.days["2026-10-08"].scheduled).toBe(true);
      expect(stoppedHabit.days["2026-10-08"].completed).toBe(false);

      // After Oct 8 (e.g. Oct 9 to 31): marked outsideTracking, unscheduled
      expect(stoppedHabit.days["2026-10-09"]).toEqual({
        scheduled: false,
        completed: false,
        outsideTracking: true,
      });
      expect(stoppedHabit.days["2026-10-31"]).toEqual({
        scheduled: false,
        completed: false,
        outsideTracking: true,
      });

      // Total scheduled should only be 8 days (Oct 1 to Oct 8)
      expect(data.summary.totalScheduled).toBe(8);
      expect(data.summary.totalCompleted).toBe(1);
    });

    it("should remove stopped habit from matrix starting the next month", async () => {
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        query: { year: "2026", month: "11" },
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-123",
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
      } as any);

      vi.mocked(prisma.habit.findMany).mockResolvedValue([
        {
          id: "h-stopped",
          title: "Read a Book",
          targetDays: "ALL",
          startDate: "2026-08-01",
          endDate: "2026-10-08",
          order: 0,
          logs: [],
        },
        {
          id: "h-ongoing",
          title: "DSA Practice",
          targetDays: "ALL",
          startDate: "2026-08-01",
          endDate: null,
          order: 1,
          logs: [],
        },
      ] as any);

      await habitController.getHabitMatrix(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const data = vi.mocked(res.json).mock.calls[0][0];

      // In November 2026: only ongoing habit is visible, stopped habit is removed
      expect(data.habits.length).toBe(1);
      expect(data.habits[0].id).toBe("h-ongoing");
      expect(data.habits[0].title).toBe("DSA Practice");
    });

    it("should display stopped habit when viewing historical months where it was ongoing", async () => {
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        query: { year: "2026", month: "9" }, // September 2026
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-123",
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
      } as any);

      vi.mocked(prisma.habit.findMany).mockResolvedValue([
        {
          id: "h-stopped",
          title: "Read a Book",
          targetDays: "ALL",
          startDate: "2026-08-01",
          endDate: "2026-10-08",
          order: 0,
          logs: [
            { id: "log-sep", habitId: "h-stopped", date: "2026-09-15", isCompleted: true },
          ],
        },
      ] as any);

      await habitController.getHabitMatrix(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const data = vi.mocked(res.json).mock.calls[0][0];

      // Habit was ongoing in September 2026 -> visible!
      expect(data.habits.length).toBe(1);
      expect(data.habits[0].id).toBe("h-stopped");
      expect(data.habits[0].days["2026-09-15"].completed).toBe(true);
      expect(data.habits[0].days["2026-09-15"].scheduled).toBe(true);
    });

    it("should prevent toggleHabit after habit finishing date", async () => {
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        params: { id: "h-stopped" },
        body: { date: "2026-10-10" },
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      vi.mocked(prisma.habit.findFirst).mockResolvedValue({
        id: "h-stopped",
        userId: "user-123",
        startDate: "2026-08-01",
        endDate: "2026-10-08",
      } as any);

      await habitController.toggleHabit(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const data = vi.mocked(res.json).mock.calls[0][0];
      expect(data.success).toBe(false);
      expect(data.error).toBe("Cannot log habits after finishing date.");
      expect(prisma.habitLog.create).not.toHaveBeenCalled();
    });

    it("should validate that endDate cannot be earlier than startDate in updateHabit", async () => {
      const req = {
        user: { id: "user-123", email: "user@lifegauge.com" },
        params: { id: "h1" },
        body: { endDate: "2026-07-01" },
      } as unknown as AuthenticatedRequest;
      const res = mockResponse();

      vi.mocked(prisma.habit.findFirst).mockResolvedValue({
        id: "h1",
        userId: "user-123",
        startDate: "2026-08-01",
      } as any);

      await habitController.updateHabit(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const data = vi.mocked(res.json).mock.calls[0][0];
      expect(data.success).toBe(false);
      expect(data.error).toContain("earlier than start date");
    });
  });
});
