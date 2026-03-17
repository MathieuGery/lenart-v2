import { eq, isNotNull } from 'drizzle-orm'
import { orders, orderStatusEnum } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

type OrderStatus = typeof orderStatusEnum.enumValues[number]

const MOLLIE_TO_STATUS: Record<string, OrderStatus> = {
  open: 'pending',
  pending: 'pending',
  authorized: 'pending',
  paid: 'paid',
  canceled: 'cancelled',
  expired: 'expired',
  failed: 'failed'
}

export default defineEventHandler(async () => {
  const toSync = await db.select()
    .from(orders)
    .where(isNotNull(orders.molliePaymentId))

  if (!toSync.length) return { synced: 0, updated: 0 }

  const mollie = getMollie()
  let updated = 0
  const errors: string[] = []

  await Promise.all(toSync.map(async (order) => {
    try {
      const payment = await mollie.payments.get({ paymentId: order.molliePaymentId! })
      const newStatus = MOLLIE_TO_STATUS[payment.status ?? '']

      if (!newStatus || newStatus === order.status) return

      await db.update(orders)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(orders.id, order.id))
      updated++
    } catch {
      errors.push(order.id)
    }
  }))

  return { synced: toSync.length, updated, errors }
})
