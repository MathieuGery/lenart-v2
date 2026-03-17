import { eq } from 'drizzle-orm'
import { orders, orderStatusEnum } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

type OrderStatus = typeof orderStatusEnum.enumValues[number]

const MOLLIE_TO_STATUS: Record<string, OrderStatus> = {
  paid: 'paid',
  canceled: 'cancelled',
  expired: 'expired',
  failed: 'failed'
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const paymentId = body?.id as string | undefined

  if (!paymentId) return { ok: true }

  try {
    const mollie = getMollie()
    const payment = await mollie.payments.get({ paymentId })

    const newStatus = MOLLIE_TO_STATUS[payment.status ?? '']
    if (!newStatus) return { ok: true }

    await db.update(orders)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(orders.molliePaymentId, paymentId))
  } catch {
    // Mollie attend toujours un 200
  }

  return { ok: true }
})
