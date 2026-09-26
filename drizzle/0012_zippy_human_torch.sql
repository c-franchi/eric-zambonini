CREATE TABLE `owner_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`link` text NOT NULL,
	`created_at` text NOT NULL,
	`read_at` text,
	`email_status` text DEFAULT 'PENDING' NOT NULL,
	`email_attempts` integer DEFAULT 0 NOT NULL,
	`last_attempt_at` text,
	`email_error` text
);
