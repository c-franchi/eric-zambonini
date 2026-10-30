CREATE TABLE `cash_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`date` text NOT NULL,
	`category` text NOT NULL,
	`note` text NOT NULL,
	`source_key` text,
	`actor` text NOT NULL,
	`created_at` text NOT NULL,
	`voided_at` text,
	`void_reason` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cash_source_unique` ON `cash_entries` (`source_key`);--> statement-breakpoint
CREATE TABLE `service_completions` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`revenue_cents` integer NOT NULL,
	`created_at` text NOT NULL,
	`actor` text NOT NULL,
	`voided_at` text,
	`void_reason` text,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `service_supplies` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`supply_id` text NOT NULL,
	`quantity_milli` integer NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supply_id`) REFERENCES `supplies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `service_supply_unique` ON `service_supplies` (`service_id`,`supply_id`);--> statement-breakpoint
CREATE TABLE `supplies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`stock_milli` integer DEFAULT 0 NOT NULL,
	`unit_cost_cents` integer DEFAULT 0 NOT NULL,
	`minimum_milli` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `supply_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`supply_id` text NOT NULL,
	`completion_id` text,
	`quantity_milli` integer NOT NULL,
	`unit_cost_cents` integer NOT NULL,
	`kind` text NOT NULL,
	`note` text NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`supply_id`) REFERENCES `supplies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`completion_id`) REFERENCES `service_completions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX completion_active_booking ON service_completions(booking_id) WHERE voided_at IS NULL;
--> statement-breakpoint
CREATE INDEX supply_history ON supply_movements(supply_id,created_at);
--> statement-breakpoint
CREATE INDEX cash_date ON cash_entries(date);
--> statement-breakpoint
CREATE TRIGGER supply_balance_insert BEFORE INSERT ON supplies WHEN NEW.stock_milli<0 OR NEW.unit_cost_cents<0 OR NEW.minimum_milli<0 BEGIN SELECT RAISE(ABORT,'Saldo ou custo invalido'); END;
--> statement-breakpoint
CREATE TRIGGER supply_balance_update BEFORE UPDATE ON supplies WHEN NEW.stock_milli<0 OR NEW.unit_cost_cents<0 OR NEW.minimum_milli<0 BEGIN SELECT RAISE(ABORT,'Estoque de insumo insuficiente'); END;
--> statement-breakpoint
CREATE TRIGGER recipe_quantity BEFORE INSERT ON service_supplies WHEN NEW.quantity_milli<=0 BEGIN SELECT RAISE(ABORT,'Quantidade invalida'); END;
--> statement-breakpoint
CREATE TRIGGER supply_move AFTER INSERT ON supply_movements BEGIN
 UPDATE supplies SET stock_milli=stock_milli+NEW.quantity_milli,updated_at=NEW.created_at,unit_cost_cents=CASE WHEN NEW.kind='PURCHASE' THEN NEW.unit_cost_cents ELSE unit_cost_cents END WHERE id=NEW.supply_id;
END;
--> statement-breakpoint
CREATE TRIGGER completion_validate BEFORE INSERT ON service_completions BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM bookings WHERE id=NEW.booking_id AND status<>'CANCELLED' AND price_variable=0 AND price_cents=NEW.revenue_cents AND date<=date('now','-3 hours')) THEN RAISE(ABORT,'Atendimento indisponivel para conclusao') END;
END;
--> statement-breakpoint
CREATE TRIGGER completion_consume AFTER INSERT ON service_completions BEGIN
 INSERT INTO supply_movements(id,supply_id,completion_id,quantity_milli,unit_cost_cents,kind,note,actor,created_at)
 SELECT NEW.id||':'||r.supply_id,r.supply_id,NEW.id,-r.quantity_milli,s.unit_cost_cents,'SERVICE','Consumo do atendimento',NEW.actor,NEW.created_at FROM service_supplies r JOIN supplies s ON s.id=r.supply_id JOIN bookings b ON b.service_id=r.service_id WHERE b.id=NEW.booking_id;
END;
--> statement-breakpoint
CREATE TRIGGER completion_restore AFTER UPDATE OF voided_at ON service_completions WHEN OLD.voided_at IS NULL AND NEW.voided_at IS NOT NULL BEGIN
 INSERT INTO supply_movements(id,supply_id,completion_id,quantity_milli,unit_cost_cents,kind,note,actor,created_at)
 SELECT 'undo:'||id,supply_id,completion_id,-quantity_milli,unit_cost_cents,'REVERSAL',NEW.void_reason,NEW.actor,NEW.voided_at FROM supply_movements WHERE completion_id=NEW.id AND kind='SERVICE';
END;
--> statement-breakpoint
CREATE TRIGGER completed_booking_lock BEFORE UPDATE OF service_id,date,time,status,price_cents ON bookings WHEN EXISTS(SELECT 1 FROM service_completions WHERE booking_id=OLD.id AND voided_at IS NULL) AND (NEW.service_id<>OLD.service_id OR NEW.date<>OLD.date OR NEW.time<>OLD.time OR NEW.status<>OLD.status OR NEW.price_cents<>OLD.price_cents) BEGIN SELECT RAISE(ABORT,'Estorne a conclusao antes de alterar ou cancelar'); END;
--> statement-breakpoint
CREATE TRIGGER paid_booking_insert AFTER INSERT ON bookings WHEN NEW.payment_status='PAID' BEGIN
 INSERT OR IGNORE INTO cash_entries(id,kind,amount_cents,date,category,note,source_key,actor,created_at) VALUES('booking:'||NEW.id,'IN',NEW.price_cents,date('now','-3 hours'),'Atendimentos','Recebimento de atendimento','booking:'||NEW.id,'system',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
--> statement-breakpoint
CREATE TRIGGER paid_booking_update AFTER UPDATE OF payment_status ON bookings WHEN NEW.payment_status='PAID' AND OLD.payment_status<>'PAID' BEGIN
 INSERT OR IGNORE INTO cash_entries(id,kind,amount_cents,date,category,note,source_key,actor,created_at) VALUES('booking:'||NEW.id,'IN',NEW.price_cents,date('now','-3 hours'),'Atendimentos','Recebimento de atendimento','booking:'||NEW.id,'system',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
--> statement-breakpoint
CREATE TRIGGER paid_sale_insert AFTER INSERT ON product_sales WHEN NEW.payment_status='PAID' BEGIN
 INSERT OR IGNORE INTO cash_entries(id,kind,amount_cents,date,category,note,source_key,actor,created_at) VALUES('sale:'||NEW.id,'IN',NEW.total_cents,date('now','-3 hours'),'Produtos','Recebimento de venda','sale:'||NEW.id,'system',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
--> statement-breakpoint
CREATE TRIGGER paid_sale_update AFTER UPDATE OF payment_status ON product_sales WHEN NEW.payment_status='PAID' AND OLD.payment_status<>'PAID' BEGIN
 INSERT OR IGNORE INTO cash_entries(id,kind,amount_cents,date,category,note,source_key,actor,created_at) VALUES('sale:'||NEW.id,'IN',NEW.total_cents,date('now','-3 hours'),'Produtos','Recebimento de venda','sale:'||NEW.id,'system',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
--> statement-breakpoint
CREATE TRIGGER paid_order_update AFTER UPDATE OF payment_status ON product_orders WHEN NEW.payment_status='PAID' AND OLD.payment_status<>'PAID' BEGIN
 INSERT OR IGNORE INTO cash_entries(id,kind,amount_cents,date,category,note,source_key,actor,created_at) VALUES('order:'||NEW.id,'IN',NEW.total_cents,date('now','-3 hours'),'Produtos','Recebimento de encomenda','order:'||NEW.id,'system',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
