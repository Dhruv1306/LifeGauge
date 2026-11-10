CREATE TABLE `habit_schedule_overrides` (
    `id` VARCHAR(191) NOT NULL,
    `habitId` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `scheduled` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE INDEX `habit_schedule_overrides_habitId_date_key` (`habitId`, `date`),
    INDEX `habit_schedule_overrides_habitId_idx` (`habitId`),
    CONSTRAINT `habit_schedule_overrides_habitId_fkey` FOREIGN KEY (`habitId`) REFERENCES `habits`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
