CREATE INDEX `product_sale_items_sale` ON `product_sale_items` (`sale_id`);--> statement-breakpoint
CREATE INDEX `product_sales_user_created` ON `product_sales` (`user_sub`,`created_at`);--> statement-breakpoint
CREATE INDEX `product_sales_created` ON `product_sales` (`created_at`);