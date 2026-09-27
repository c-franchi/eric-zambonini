import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const services = sqliteTable('services', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon'),
  description: text('description'),
  durationMin: integer('duration_min').notNull(),
  interleavedBlocks: text('interleaved_blocks'),
  priceCents: integer('price_cents').notNull(),
  priceVariable: integer('price_variable', {mode:'boolean'}).notNull().default(false),
  allowInPersonPayment: integer('allow_in_person_payment', {mode:'boolean'}).notNull().default(true),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const users = sqliteTable('users', {
  sub: text('sub').primaryKey(),
  email: text('email').notNull(),
  passwordHash: text('password_hash'),
  name: text('name').notNull(),
  phone: text('phone'),
  createdAt: text('created_at').notNull(),
});

export const authAttempts = sqliteTable('auth_attempts', {
  email: text('email').primaryKey(),
  failures: integer('failures').notNull().default(0),
  windowStarted: integer('window_started').notNull(),
});

export const bookings = sqliteTable('bookings', {
  id: text('id').primaryKey(),
  serviceId: text('service_id').notNull().references(() => services.id),
  userSub: text('user_sub').references(() => users.sub),
  date: text('date').notNull(),
  time: text('time').notNull(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  status: text('status').notNull().default('CONFIRMED'),
  priceCents: integer('price_cents').notNull().default(0),
  priceVariable: integer('price_variable', {mode:'boolean'}).notNull().default(false),
  paymentMethod: text('payment_method').notNull().default('IN_PERSON'),
  paymentStatus: text('payment_status').notNull().default('PENDING'),
  receiptKey: text('receipt_key'),
  createdAt: text('created_at').notNull(),
  cancelledAt: text('cancelled_at'),
});

export const bookedSlots = sqliteTable('booked_slots', {
  bookingId: text('booking_id').notNull().references(() => bookings.id),
  date: text('date').notNull(),
  slot: text('slot').notNull(),
}, (table) => [uniqueIndex('booked_slots_date_slot').on(table.date, table.slot)]);

export const blockedSlots = sqliteTable('blocked_slots', {
  date: text('date').notNull(),
  slot: text('slot').notNull(),
  reason: text('reason'),
}, (table) => [uniqueIndex('blocked_slots_date_slot').on(table.date, table.slot)]);

export const portfolio = sqliteTable('portfolio', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  altText: text('alt_text').notNull(),
  imageKey: text('image_key').notNull(),
  active: integer('active', {mode:'boolean'}).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const messages = sqliteTable('messages', {
 id: text('id').primaryKey(),
 userSub: text('user_sub').notNull().references(() => users.sub),
 sender: text('sender').notNull(),
 body: text('body').notNull(),
 createdAt: text('created_at').notNull(),
});

export const ownerNotifications = sqliteTable('owner_notifications', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  link: text('link').notNull(),
  createdAt: text('created_at').notNull(),
  readAt: text('read_at'),
  emailStatus: text('email_status').notNull().default('PENDING'),
  emailAttempts: integer('email_attempts').notNull().default(0),
  lastAttemptAt: text('last_attempt_at'),
  emailError: text('email_error'),
  emailProviderId: text('email_provider_id'),
});

export const pushSubscriptions = sqliteTable('push_subscriptions', {
 endpoint: text('endpoint').primaryKey(),
 userSub: text('user_sub').notNull().references(() => users.sub, {onDelete:'cascade'}),
 p256dh: text('p256dh').notNull(),
 auth: text('auth').notNull(),
 createdAt: text('created_at').notNull(),
});
export const pushDeliveries = sqliteTable('push_deliveries', {
 id: text('id').primaryKey(),
 endpoint: text('endpoint').notNull(),
 createdAt: text('created_at').notNull(),
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  priceCents: integer('price_cents').notNull(),
  stock: integer('stock').notNull().default(0),
  allowPreorder: integer('allow_preorder', {mode:'boolean'}).notNull().default(false),
  imageKey: text('image_key'),
  active: integer('active', {mode:'boolean'}).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const productOrders = sqliteTable('product_orders', {
  id: text('id').primaryKey(),
  requestKey: text('request_key').notNull().unique(),
  userSub: text('user_sub').notNull().references(() => users.sub),
  bookingId: text('booking_id').notNull().references(() => bookings.id),
  status: text('status').notNull().default('PENDING'),
  paymentStatus: text('payment_status').notNull().default('DUE_AT_APPOINTMENT'),
  totalCents: integer('total_cents').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const productOrderItems = sqliteTable('product_order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => productOrders.id, {onDelete:'cascade'}),
  productId: text('product_id').notNull().references(() => products.id),
  productName: text('product_name').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
  quantity: integer('quantity').notNull(),
  isPreorder: integer('is_preorder', {mode:'boolean'}).notNull().default(false),
});

export const productSales = sqliteTable('product_sales', {
  id: text('id').primaryKey(),
  requestKey: text('request_key').notNull().unique(),
  userSub: text('user_sub').references(() => users.sub),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone').notNull(),
  status: text('status').notNull().default('PENDING'),
  paymentMethod: text('payment_method').notNull(),
  paymentStatus: text('payment_status').notNull(),
  totalCents: integer('total_cents').notNull(),
  pickupMethod: text('pickup_method').notNull().default('IN_STORE'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [index('product_sales_user_created').on(table.userSub, table.createdAt), index('product_sales_created').on(table.createdAt)]);

export const productSaleItems = sqliteTable('product_sale_items', {
  id: text('id').primaryKey(),
  saleId: text('sale_id').notNull().references(() => productSales.id, {onDelete:'cascade'}),
  productId: text('product_id').notNull().references(() => products.id),
  productName: text('product_name').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
  quantity: integer('quantity').notNull(),
  isPreorder: integer('is_preorder', {mode:'boolean'}).notNull().default(false),
}, (table) => [index('product_sale_items_sale').on(table.saleId)]);
