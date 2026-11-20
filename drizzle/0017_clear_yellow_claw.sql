CREATE TABLE `product_sale_items` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`product_id` text NOT NULL,
	`product_name` text NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`quantity` integer NOT NULL,
	`is_preorder` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `product_sales`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product_sales` (
	`id` text PRIMARY KEY NOT NULL,
	`request_key` text NOT NULL,
	`user_sub` text,
	`customer_name` text NOT NULL,
	`customer_email` text NOT NULL,
	`customer_phone` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`payment_method` text NOT NULL,
	`payment_status` text NOT NULL,
	`total_cents` integer NOT NULL,
	`pickup_method` text DEFAULT 'IN_STORE' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_sub`) REFERENCES `users`(`sub`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_sales_request_key_unique` ON `product_sales` (`request_key`);