CREATE TABLE `portfolio` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`alt_text` text NOT NULL,
	`image_key` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `price_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `payment_method` text DEFAULT 'IN_PERSON' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `payment_status` text DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `receipt_key` text;