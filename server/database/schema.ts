import { pgTable, uuid, varchar, timestamp, integer, text, uniqueIndex, index, pgEnum, boolean } from 'drizzle-orm/pg-core'

export const contactMessageStatusEnum = pgEnum('contact_message_status', ['new', 'read', 'archived'])
export const orderStatusEnum = pgEnum('order_status', ['pending', 'paid', 'cancelled', 'expired', 'failed'])

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
  formulaName: varchar('formula_name', { length: 255 }),
  address: varchar('address', { length: 500 }),
  city: varchar('city', { length: 255 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 255 }),
  cashPayment: boolean('cash_payment').notNull().default(false),
  status: orderStatusEnum('status').notNull().default('pending'),
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
  photoId: uuid('photo_id').references(() => photos.id, { onDelete: 'restrict' }),
  photoFilename: varchar('photo_filename', { length: 255 }),
  priceCents: integer('price_cents').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

export const pricingFormulas = pgTable('pricing_formulas', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  basePriceCents: integer('base_price_cents').notNull().default(0),
  isFeatured: boolean('is_featured').notNull().default(false),
  digitalPhotosCount: integer('digital_photos_count').notNull().default(0),
  printDetails: varchar('print_details', { length: 255 }),
  extraPhotoPriceCents: integer('extra_photo_price_cents'),
  isTourComplete: boolean('is_tour_complete').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

export const settings = pgTable('settings', {
  key: varchar('key', { length: 255 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

export const pricingFormulaFeatures = pgTable('pricing_formula_features', {
  id: uuid('id').defaultRandom().primaryKey(),
  formulaId: uuid('formula_id').notNull().references(() => pricingFormulas.id, { onDelete: 'cascade' }),
  featureText: varchar('feature_text', { length: 500 }).notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull()
})
