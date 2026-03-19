import { eq, count, sum, desc, and, isNull } from 'drizzle-orm'
import { orders, orderItems, photos, collections, contactMessages } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async () => {
  const [
    orderStats,
    photoStats,
    collectionCount,
    unreadMessages,
    recentOrders,
    photosSold,
    unlinkedPhotos,
    formulaStats
  ] = await Promise.all([
    // Orders grouped by status + cash_payment
    db.select({
      status: orders.status,
      cashPayment: orders.cashPayment,
      orderCount: count(orders.id),
      totalCents: sum(orders.totalCents)
    })
      .from(orders)
      .groupBy(orders.status, orders.cashPayment),

    // Total photos in DB
    db.select({ total: count(photos.id) }).from(photos),

    // Collections count
    db.select({ total: count(collections.id) }).from(collections),

    // Unread contact messages
    db.select({ total: count(contactMessages.id) })
      .from(contactMessages)
      .where(eq(contactMessages.status, 'new')),

    // Last 5 orders
    db.select({
      id: orders.id,
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
      .limit(5),

    // Photos sold (from paid orders)
    db.select({ total: count(orderItems.id) })
      .from(orderItems)
      .innerJoin(orders, and(
        eq(orders.id, orderItems.orderId),
        eq(orders.status, 'paid')
      )),

    // Unlinked order items (photoId is null)
    db.select({ total: count(orderItems.id) })
      .from(orderItems)
      .where(isNull(orderItems.photoId)),

    // Orders grouped by formula
    db.select({
      formulaName: orders.formulaName,
      orderCount: count(orders.id)
    })
      .from(orders)
      .groupBy(orders.formulaName)
  ])

  // Aggregate revenue and order counts
  let revenuePaidCents = 0
  let revenueCashPendingCents = 0
  let countPaid = 0
  let countPending = 0
  let countCashPending = 0
  let countCancelled = 0
  let countOther = 0
  let totalOrders = 0

  for (const row of orderStats) {
    const cents = Number(row.totalCents ?? 0)
    const n = Number(row.orderCount ?? 0)
    totalOrders += n

    if (row.status === 'paid') {
      revenuePaidCents += cents
      countPaid += n
    } else if (row.status === 'pending' && row.cashPayment) {
      revenueCashPendingCents += cents
      countCashPending += n
      countPending += n
    } else if (row.status === 'pending') {
      countPending += n
    } else if (row.status === 'cancelled') {
      countCancelled += n
    } else {
      countOther += n
    }
  }

  return {
    revenue: {
      paidCents: revenuePaidCents,
      cashPendingCents: revenueCashPendingCents
    },
    orders: {
      total: totalOrders,
      paid: countPaid,
      pending: countPending,
      cashPending: countCashPending,
      cancelled: countCancelled,
      other: countOther
    },
    photos: {
      total: photoStats[0]?.total ?? 0,
      sold: photosSold[0]?.total ?? 0,
      unlinked: unlinkedPhotos[0]?.total ?? 0
    },
    collections: collectionCount[0]?.total ?? 0,
    messages: {
      unread: unreadMessages[0]?.total ?? 0
    },
    recentOrders,
    formulas: formulaStats.map(r => ({
      name: r.formulaName ?? 'Sans formule',
      count: Number(r.orderCount)
    }))
  }
})
