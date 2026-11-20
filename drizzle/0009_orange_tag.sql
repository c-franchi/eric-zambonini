CREATE TABLE `auth_attempts` (
	`email` text PRIMARY KEY NOT NULL,
	`failures` integer DEFAULT 0 NOT NULL,
	`window_started` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `users` ADD `password_hash` text;