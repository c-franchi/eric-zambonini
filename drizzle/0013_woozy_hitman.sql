CREATE TABLE `push_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`endpoint` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`endpoint` text PRIMARY KEY NOT NULL,
	`user_sub` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_sub`) REFERENCES `users`(`sub`) ON UPDATE no action ON DELETE cascade
);
