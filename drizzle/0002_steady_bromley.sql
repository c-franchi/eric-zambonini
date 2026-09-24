CREATE TABLE `blocked_slots` (
	`date` text NOT NULL,
	`slot` text NOT NULL,
	`reason` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blocked_slots_date_slot` ON `blocked_slots` (`date`,`slot`);