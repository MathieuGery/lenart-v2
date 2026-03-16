import { z } from 'zod'
import { eq, inArray } from 'drizzle-orm'
import { photos, orders, orderItems } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

const bodySchema = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  email: z.email(),
  photoIds: z.array(z.string().uuid()).min(1).max(100)
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)

  const priceCents = Number(process.env.PHOTO_PRICE_CENTS ?? 500)
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000'

  // Validate all photos exist
  const foundPhotos = await db
    .select({ id: photos.id })
    .from(photos)
    .where(inArray(photos.id, body.photoIds))

  if (foundPhotos.length !== body.photoIds.length) {
    throw createError({ statusCode: 400, message: 'Certaines photos sont introuvables' })
  }

  const totalCents = body.photoIds.length * priceCents

  // Create order
  const [order] = await db.insert(orders).values({
    email: body.email,
    firstName: body.firstName,
    lastName: body.lastName,
    totalCents,
    status: 'pending'
  }).returning()

  // Create order items
  await db.insert(orderItems).values(
    body.photoIds.map(photoId => ({
      orderId: order.id,
      photoId,
      priceCents
    }))
  )

  // Create Mollie payment
  const mollie = getMollie()
  const euros = (totalCents / 100).toFixed(2)

  const payment = await mollie.payments.create({
    paymentRequest: {
      description: `Commande Len-Art #${order.id.slice(0, 8)}`,
      amount: { currency: 'EUR', value: euros },
      redirectUrl: `${appUrl}/commande/succes?orderId=${order.id}`,
      cancelUrl: `${appUrl}/commande/annule?orderId=${order.id}`,
      webhookUrl: `${appUrl}/api/public/webhooks/mollie`,
      locale: 'fr_FR',
      metadata: { orderId: order.id }
    }
  })

  const checkoutUrl = payment.links?.checkout?.href
  if (!checkoutUrl) {
    throw createError({ statusCode: 500, message: 'Impossible de créer le paiement' })
  }

  // Save Mollie payment ID
  await db.update(orders)
    .set({ molliePaymentId: payment.id })
    .where(eq(orders.id, order.id))

  return { checkoutUrl, orderId: order.id }
})
