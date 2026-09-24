import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const services = sqliteTable('services', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  durationMin: integer('duration_min').notNull(),
  priceCents: integer('price_cents').notNull(),
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
  name: text('name').notNull(),
  phone: text('phone'),
  createdAt: text('created_at').notNull(),
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
  paymentMethod: text('payment_method').notNull().default('IN_PERSON'),
  paymentStatus: text('payment_status').notNull().default('PENDING'),
  receiptKey: text('receipt_key'),
  createdAt: text('created_at').notNull(),
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
