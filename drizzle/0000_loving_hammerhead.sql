CREATE TABLE `booked_slots` (
	`booking_id` text NOT NULL,
	`date` text NOT NULL,
	`slot` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `booked_slots_date_slot` ON `booked_slots` (`date`,`slot`);--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`status` text DEFAULT 'CONFIRMED' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`duration_min` integer NOT NULL,
	`price_cents` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
