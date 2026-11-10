import { prisma } from "../lib/prisma";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function getCurrentWeekStart(): string {
  const today = new Date();
  const day = today.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
  return monday.toISOString().split("T")[0];
}

async function getTopFocusEntryIds(userId: string): Promise<string[]> {
  const topEntries = await prisma.timeEntry.findMany({
    where: { userId },
    select: { id: true },
    orderBy: [{ durationMin: "desc" }, { date: "desc" }, { createdAt: "asc" }],
    take: 3,
  });
  return topEntries.map((entry) => entry.id);
}

export async function cleanupExpiredFocusSessions(): Promise<void> {
  const topEntryIds = await getTopFocusEntryIdsForAllUsers();
  const weekStart = getCurrentWeekStart();

  const deleted = await prisma.timeEntry.deleteMany({
    where: {
      date: { lt: weekStart },
      isPinned: false,
      ...(topEntryIds.length > 0 ? { id: { notIn: topEntryIds } } : {}),
    },
  });

  if (deleted.count > 0) {
    console.log(`[FocusSessionCleanup] Removed ${deleted.count} expired focus session(s)`);
  }
}

async function getTopFocusEntryIdsForAllUsers(): Promise<string[]> {
  const users = await prisma.user.findMany({ select: { id: true } });
  const ids: string[] = [];
  for (const user of users) {
    ids.push(...(await getTopFocusEntryIds(user.id)));
  }
  return ids;
}

export function startFocusSessionCleanup(): NodeJS.Timeout {
  void cleanupExpiredFocusSessions().catch((error) => {
    console.error("[FocusSessionCleanup] Initial cleanup failed:", error);
  });

  return setInterval(() => {
    void cleanupExpiredFocusSessions().catch((error) => {
      console.error("[FocusSessionCleanup] Scheduled cleanup failed:", error);
    });
  }, DAY_IN_MS);
}
