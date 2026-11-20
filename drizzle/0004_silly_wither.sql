CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`user_sub` text NOT NULL,
	`sender` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_sub`) REFERENCES `users`(`sub`) ON UPDATE no action ON DELETE no action
);
