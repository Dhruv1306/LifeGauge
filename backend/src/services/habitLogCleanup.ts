import { prisma } from "../lib/prisma";

const TWO_DAYS_IN_MS = 2 * 24 * 60 * 60 * 1000;

export async function cleanupOrphanedHabitLogs(): Promise<void> {
  const cutoff = new Date(Date.now() - TWO_DAYS_IN_MS);

  const deleted = await prisma.$executeRaw`
    DELETE FROM \`habit_logs\`
    WHERE \`loggedAt\` < ${cutoff}
      AND NOT EXISTS (
        SELECT 1
        FROM \`habits\`
        WHERE \`habits\`.\`id\` = \`habit_logs\`.\`habitId\`
      )
  `;

  if (deleted > 0) {
    console.log(`[HabitLogCleanup] Removed ${deleted} orphaned habit log(s) older than two days`);
  }
}

export function startHabitLogCleanup(): NodeJS.Timeout {
  void cleanupOrphanedHabitLogs().catch((error) => {
    console.error("[HabitLogCleanup] Initial cleanup failed:", error);
  });

  return setInterval(() => {
    void cleanupOrphanedHabitLogs().catch((error) => {
      console.error("[HabitLogCleanup] Scheduled cleanup failed:", error);
    });
  }, 24 * 60 * 60 * 1000);
}
