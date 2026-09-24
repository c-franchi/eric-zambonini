CREATE TABLE `users` (
	`sub` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `user_sub` text REFERENCES users(sub);