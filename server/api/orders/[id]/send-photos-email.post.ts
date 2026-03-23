import { eq } from 'drizzle-orm'
import { orders, orderItems } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
  if (!order) {
    throw createError({ statusCode: 404, message: 'Commande introuvable' })
  }

  if (order.businessStatus !== 'completed') {
    throw createError({ statusCode: 400, message: 'La commande doit être terminée avant d\'envoyer l\'e-mail' })
  }

  if (!order.amazonLink) {
    throw createError({ statusCode: 400, message: 'Aucun lien de téléchargement configuré' })
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id))

  await sendPhotosReadyEmail({
    to: order.email,
    firstName: order.firstName,
    orderId: order.id,
    downloadLink: order.amazonLink,
    photoCount: items.length
  })

  await db.update(orders)
    .set({ photosEmailSentAt: new Date() })
    .where(eq(orders.id, id))

  return { success: true }
})
