CREATE TABLE `inventory_operations` (
	`request_key` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`kind` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_cost_cents` integer NOT NULL,
	`note` text NOT NULL,
	`actor_sub` text NOT NULL,
	`payload` text NOT NULL,
	`applied` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`request_key` text,
	`kind` text NOT NULL,
	`quantity_delta` integer NOT NULL,
	`stock_before` integer NOT NULL,
	`stock_after` integer NOT NULL,
	`unit_cost_cents` integer NOT NULL,
	`note` text NOT NULL,
	`actor_sub` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stock_movements_request_key_unique` ON `stock_movements` (`request_key`);--> statement-breakpoint
CREATE INDEX `stock_movements_product_created` ON `stock_movements` (`product_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `products` ADD `minimum_stock` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `unit_cost_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `inventory_request_key` text;--> statement-breakpoint
CREATE TRIGGER products_inventory_insert_guard BEFORE INSERT ON products
WHEN NEW.stock < 0 OR typeof(NEW.stock)<>'integer' OR NEW.minimum_stock<0 OR typeof(NEW.minimum_stock)<>'integer' OR NEW.unit_cost_cents<0 OR typeof(NEW.unit_cost_cents)<>'integer'
BEGIN SELECT RAISE(ABORT,'Estoque ou custo invalido'); END;
--> statement-breakpoint
CREATE TRIGGER products_inventory_update_guard BEFORE UPDATE ON products
WHEN NEW.stock < 0 OR typeof(NEW.stock)<>'integer' OR NEW.minimum_stock<0 OR typeof(NEW.minimum_stock)<>'integer' OR NEW.unit_cost_cents<0 OR typeof(NEW.unit_cost_cents)<>'integer'
BEGIN SELECT RAISE(ABORT,'Estoque insuficiente ou atualizado em outra operacao'); END;
--> statement-breakpoint
CREATE TRIGGER products_initial_stock_history AFTER INSERT ON products WHEN NEW.stock<>0
BEGIN
 INSERT INTO stock_movements(id,product_id,kind,quantity_delta,stock_before,stock_after,unit_cost_cents,note,created_at)
 VALUES(lower(hex(randomblob(16))),NEW.id,'INITIAL',NEW.stock,0,NEW.stock,NEW.unit_cost_cents,'Saldo inicial no cadastro',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
--> statement-breakpoint
CREATE TRIGGER products_stock_history AFTER UPDATE OF stock ON products WHEN NEW.stock<>OLD.stock
BEGIN
 INSERT INTO stock_movements(id,product_id,request_key,kind,quantity_delta,stock_before,stock_after,unit_cost_cents,note,actor_sub,created_at)
 VALUES(lower(hex(randomblob(16))),NEW.id,
 CASE WHEN NEW.inventory_request_key IS NOT OLD.inventory_request_key THEN NEW.inventory_request_key ELSE NULL END,
 CASE WHEN NEW.inventory_request_key IS NOT OLD.inventory_request_key THEN coalesce((SELECT kind FROM inventory_operations WHERE request_key=NEW.inventory_request_key),'SYSTEM') ELSE 'SYSTEM' END,
 NEW.stock-OLD.stock,OLD.stock,NEW.stock,NEW.unit_cost_cents,
 CASE WHEN NEW.inventory_request_key IS NOT OLD.inventory_request_key THEN coalesce((SELECT note FROM inventory_operations WHERE request_key=NEW.inventory_request_key),'Movimentacao do sistema') ELSE 'Catalogo, reserva, venda ou devolucao de pedido' END,
 CASE WHEN NEW.inventory_request_key IS NOT OLD.inventory_request_key THEN (SELECT actor_sub FROM inventory_operations WHERE request_key=NEW.inventory_request_key) ELSE NULL END,
 strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
