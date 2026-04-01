import { desc, eq, count, sql } from 'drizzle-orm'
import { orders, orderItems } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const email = decodeURIComponent(getRouterParam(event, 'email') ?? '')

  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'Email requis' })
  }

  const customerOrders = await db
    .select({
      id: orders.id,
      firstName: orders.firstName,
      lastName: orders.lastName,
      email: orders.email,
      status: orders.status,
      businessStatus: orders.businessStatus,
      cashPayment: orders.cashPayment,
      createdByAdmin: orders.createdByAdmin,
      totalCents: orders.totalCents,
      formulaName: orders.formulaName,
      address: orders.address,
      city: orders.city,
      postalCode: orders.postalCode,
      country: orders.country,
      createdAt: orders.createdAt,
      photoCount: count(orderItems.id)
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(eq(orders.email, email))
    .groupBy(orders.id)
    .orderBy(desc(orders.createdAt))

  if (!customerOrders.length) {
    throw createError({ statusCode: 404, statusMessage: 'Client introuvable' })
  }

  const latest = customerOrders[0]!
  const paidOrders = customerOrders.filter(o => o.status === 'paid')

  return {
    email,
    firstName: latest.firstName,
    lastName: latest.lastName,
    address: latest.address,
    city: latest.city,
    postalCode: latest.postalCode,
    country: latest.country,
    orderCount: customerOrders.length,
    paidOrderCount: paidOrders.length,
    totalSpentCents: paidOrders.reduce((s, o) => s + o.totalCents, 0),
    totalPhotoCount: customerOrders.reduce((s, o) => s + o.photoCount, 0),
    firstOrderAt: customerOrders[customerOrders.length - 1]!.createdAt,
    lastOrderAt: latest.createdAt,
    orders: customerOrders
  }
})
