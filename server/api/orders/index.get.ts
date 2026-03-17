import { desc, count, eq } from 'drizzle-orm'
import { orders, orderItems } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async () => {
  const rows = await db
    .select({
      id: orders.id,
      email: orders.email,
      firstName: orders.firstName,
      lastName: orders.lastName,
      status: orders.status,
      cashPayment: orders.cashPayment,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
      photoCount: count(orderItems.id)
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .groupBy(orders.id)
    .orderBy(desc(orders.createdAt))

  return rows
})
