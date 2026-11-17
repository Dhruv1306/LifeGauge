-- DropForeignKey
ALTER TABLE `google_calendar_tokens` DROP FOREIGN KEY `google_calendar_tokens_userId_fkey`;

-- DropForeignKey
ALTER TABLE `calendar_events` DROP FOREIGN KEY `calendar_events_userId_fkey`;

-- DropTable
DROP TABLE IF EXISTS `google_calendar_tokens`;

-- DropTable
DROP TABLE IF EXISTS `calendar_events`;
