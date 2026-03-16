import { pgTable, uuid, varchar, timestamp, integer, text, uniqueIndex, index, pgEnum } from 'drizzle-orm/pg-core'

export const contactMessageStatusEnum = pgEnum('contact_message_status', ['new', 'read', 'archived'])

export const admins = pgTable('admins', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

export const collections = pgTable('collections', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

export const photos = pgTable('photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  collectionId: uuid('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  key: varchar('key', { length: 512 }).notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  hash: varchar('hash', { length: 64 }).notNull(),
  size: integer('size').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => [
  uniqueIndex('photos_collection_hash_idx').on(table.collectionId, table.hash)
])

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  molliePaymentId: varchar('mollie_payment_id', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  totalCents: integer('total_cents').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => [
  index('orders_mollie_payment_id_idx').on(table.molliePaymentId)
])

export const contactMessages = pgTable('contact_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  message: text('message').notNull(),
  status: contactMessageStatusEnum('status').notNull().default('new'),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  photoId: uuid('photo_id').notNull().references(() => photos.id, { onDelete: 'restrict' }),
  priceCents: integer('price_cents').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
})
