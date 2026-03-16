import { eq, isNotNull } from 'drizzle-orm'
import { orders } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

// Correspondance statut Mollie → statut application
const MOLLIE_TO_APP: Record<string, string> = {
  open: 'pending',        // paiement créé, pas encore démarré
  pending: 'pending',     // en attente (ex: virement bancaire)
  authorized: 'pending',  // autorisé mais pas encore capturé
  paid: 'paid',
  canceled: 'cancelled',
  expired: 'expired',
  failed: 'failed'
}

export default defineEventHandler(async () => {
  // Toutes les orders liées à un paiement Mollie, quel que soit le statut actuel
  const toSync = await db.select()
    .from(orders)
    .where(isNotNull(orders.molliePaymentId))

  if (!toSync.length) {
    return { synced: 0, updated: 0 }
  }

  const mollie = getMollie()
  let updated = 0
  const errors: string[] = []

  await Promise.all(toSync.map(async (order) => {
    try {
      const payment = await mollie.payments.get({ paymentId: order.molliePaymentId! })
      const newStatus = MOLLIE_TO_APP[payment.status ?? '']

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
