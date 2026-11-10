-- Add a name to focus blocks and remove the unused notes field.
ALTER TABLE `time_entries`
    ADD COLUMN `name` VARCHAR(191) NOT NULL DEFAULT 'Focus Session' AFTER `taskId`,
    DROP COLUMN `description`;
