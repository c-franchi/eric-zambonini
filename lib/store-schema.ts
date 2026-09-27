import { db } from '@/lib/server';

export async function ensureStoreSchema() {
  const database = db();
  const ready=await database.prepare("SELECT value FROM settings WHERE key='store_schema_v1'").first();
  if(ready)return;
  await database.batch([
    database.prepare(`CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price_cents INTEGER NOT NULL CHECK(price_cents > 0),
      stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
      allow_preorder INTEGER NOT NULL DEFAULT 0,
      image_key TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE TABLE IF NOT EXISTS product_orders (
      id TEXT PRIMARY KEY,
      request_key TEXT NOT NULL UNIQUE,
      user_sub TEXT NOT NULL REFERENCES users(sub),
      booking_id TEXT NOT NULL REFERENCES bookings(id),
      status TEXT NOT NULL DEFAULT 'PENDING',
      payment_status TEXT NOT NULL DEFAULT 'DUE_AT_APPOINTMENT',
      total_cents INTEGER NOT NULL CHECK(total_cents >= 0),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE TABLE IF NOT EXISTS product_order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES product_orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      unit_price_cents INTEGER NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      is_preorder INTEGER NOT NULL DEFAULT 0
    )`),
    database.prepare('CREATE INDEX IF NOT EXISTS product_orders_user_created ON product_orders(user_sub,created_at DESC)'),
    database.prepare('CREATE INDEX IF NOT EXISTS product_orders_booking ON product_orders(booking_id,status)'),
    database.prepare('CREATE INDEX IF NOT EXISTS product_order_items_order ON product_order_items(order_id)'),
    database.prepare("INSERT INTO settings(key,value) VALUES('store_schema_v1','ready') ON CONFLICT(key) DO UPDATE SET value=excluded.value"),
  ]);
}
