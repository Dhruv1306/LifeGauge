-- CreateTable
CREATE TABLE `google_calendar_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `encryptedRefreshToken` TEXT NOT NULL,
    `googleEmail` VARCHAR(191) NULL,
    `syncToken` TEXT NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `google_calendar_tokens_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_events` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `googleEventId` VARCHAR(191) NOT NULL,
    `googleCalendarId` VARCHAR(191) NOT NULL DEFAULT 'primary',
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `location` VARCHAR(191) NULL,
    `startTime` DATETIME(3) NULL,
    `endTime` DATETIME(3) NULL,
    `startDate` VARCHAR(191) NULL,
    `endDate` VARCHAR(191) NULL,
    `isAllDay` BOOLEAN NOT NULL DEFAULT false,
    `isRecurring` BOOLEAN NOT NULL DEFAULT false,
    `recurringEventId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'confirmed',
    `timezone` VARCHAR(191) NULL,
    `etag` VARCHAR(191) NULL,
    `writtenByUsAt` DATETIME(3) NULL,
    `syncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `calendar_events_userId_idx`(`userId`),
    INDEX `calendar_events_userId_startTime_idx`(`userId`, `startTime`),
    INDEX `calendar_events_userId_startDate_idx`(`userId`, `startDate`),
    UNIQUE INDEX `calendar_events_userId_googleEventId_key`(`userId`, `googleEventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `google_calendar_tokens` ADD CONSTRAINT `google_calendar_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
