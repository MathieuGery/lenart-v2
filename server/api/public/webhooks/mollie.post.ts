import { eq } from 'drizzle-orm'
import { orders } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

const MOLLIE_STATUS_MAP: Record<string, string> = {
  paid: 'paid',
  canceled: 'cancelled',
  expired: 'expired',
  failed: 'failed'
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const paymentId = body?.id as string | undefined

  // Mollie sends form-encoded body, also handle that
  if (!paymentId) {
    return { ok: true }
  }

  try {
    const mollie = getMollie()
    const payment = await mollie.payments.get({ paymentId })

    const newStatus = MOLLIE_STATUS_MAP[payment.status ?? '']
    if (!newStatus) return { ok: true }

    await db.update(orders)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(orders.molliePaymentId, paymentId))
  } catch {
    // Log but don't throw — Mollie expects a 200 response
  }

  return { ok: true }
})
