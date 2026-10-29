-- AlterTable
ALTER TABLE `habits` ADD COLUMN `startDate` VARCHAR(191) NULL,
    ADD COLUMN `order` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `habits_userId_order_idx` ON `habits`(`userId`, `order`);

-- Safe Data Migration: Populate startDate for existing habits
-- For habits with existing logs, use their earliest logged date.
-- For habits without logs, use DATE_FORMAT(createdAt, '%Y-%m-%d').
UPDATE `habits` h
SET h.`startDate` = COALESCE(
    (SELECT MIN(hl.`date`) FROM `habit_logs` hl WHERE hl.`habitId` = h.`id`),
    DATE_FORMAT(h.`createdAt`, '%Y-%m-%d')
)
WHERE h.`startDate` IS NULL;
