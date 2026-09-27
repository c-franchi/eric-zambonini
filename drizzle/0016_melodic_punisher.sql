CREATE TABLE `product_order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`product_name` text NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`quantity` integer NOT NULL,
	`is_preorder` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `product_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`request_key` text NOT NULL,
	`user_sub` text NOT NULL,
	`booking_id` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`payment_status` text DEFAULT 'DUE_AT_APPOINTMENT' NOT NULL,
	`total_cents` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_sub`) REFERENCES `users`(`sub`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_orders_request_key_unique` ON `product_orders` (`request_key`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`price_cents` integer NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`allow_preorder` integer DEFAULT false NOT NULL,
	`image_key` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
