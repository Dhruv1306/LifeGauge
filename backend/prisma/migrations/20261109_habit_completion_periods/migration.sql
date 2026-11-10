CREATE TABLE `habit_periods` (
    `id` VARCHAR(191) NOT NULL,
    `habitId` VARCHAR(191) NOT NULL,
    `startDate` VARCHAR(191) NOT NULL,
    `endDate` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    INDEX `habit_periods_habitId_idx` (`habitId`),
    CONSTRAINT `habit_periods_habitId_fkey` FOREIGN KEY (`habitId`) REFERENCES `habits`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `habit_periods` (`id`, `habitId`, `startDate`, `endDate`)
SELECT UUID(), `id`, `startDate`, `endDate`
FROM `habits`
WHERE `endDate` IS NOT NULL AND `startDate` IS NOT NULL;
