-- Keep explicitly pinned focus sessions permanently.
ALTER TABLE `time_entries`
    ADD COLUMN `isPinned` BOOLEAN NOT NULL DEFAULT false AFTER `durationMin`;

CREATE INDEX `time_entries_userId_isPinned_idx`
    ON `time_entries` (`userId`, `isPinned`);
