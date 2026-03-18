import { z } from 'zod'
import { eq, inArray } from 'drizzle-orm'
import { photos, orders, orderItems } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

const bodySchema = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  email: z.string().email(),
  photoIds: z.array(z.string().uuid()).min(1).max(100),
  paymentMethod: z.enum(['link', 'terminal', 'cash']),
  terminalId: z.string().optional()
}).refine(d => d.paymentMethod !== 'terminal' || !!d.terminalId, {
  message: 'terminalId requis pour le paiement par terminal',
  path: ['terminalId']
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)

  const priceCents = Number(process.env.PHOTO_PRICE_CENTS ?? 500)
  const appUrl = process.env.NUXT_APP_URL ?? 'http://localhost:3000'

  // Validate photos
  const foundPhotos = await db
    .select({ id: photos.id })
    .from(photos)
    .where(inArray(photos.id, body.photoIds))

  if (foundPhotos.length !== body.photoIds.length) {
    throw createError({ statusCode: 400, message: 'Certaines photos sont introuvables' })
  }

  const totalCents = body.photoIds.length * priceCents
  const euros = (totalCents / 100).toFixed(2)

  // Create order
  const [order] = await db.insert(orders).values({
    email: body.email,
    firstName: body.firstName,
    lastName: body.lastName,
    totalCents,
    cashPayment: body.paymentMethod === 'cash',
    status: 'pending'
  }).returning()

  if (!order) {
    throw createError({ statusCode: 500, message: 'Erreur lors de la création de la commande' })
  }
  await db.insert(orderItems).values(
    body.photoIds.map(photoId => ({ orderId: order.id, photoId, priceCents }))
  )

  // Cash payment — no Mollie involved
  if (body.paymentMethod === 'cash') {
    return { orderId: order.id, checkoutUrl: null }
  }

  // Create Mollie payment
  const mollie = getMollie()
  const description = `Commande Len-Art #${order.id.slice(0, 8)}`

  let payment
  if (body.paymentMethod === 'terminal') {
    payment = await mollie.payments.create({
      paymentRequest: {
        description,
        amount: { currency: 'EUR', value: euros },
        redirectUrl: null,
        method: 'pointofsale',
        terminalId: body.terminalId,
        webhookUrl: `${appUrl}/api/public/webhooks/mollie`,
        metadata: { orderId: order.id }
      }
    })
  } else {
    payment = await mollie.payments.create({
      paymentRequest: {
        description,
        amount: { currency: 'EUR', value: euros },
        redirectUrl: `${appUrl}/commande/succes?orderId=${order.id}`,
        cancelUrl: `${appUrl}/commande/annule?orderId=${order.id}`,
        webhookUrl: `${appUrl}/api/public/webhooks/mollie`,
        locale: 'fr_FR',
        metadata: { orderId: order.id }
      }
    })
  }

  await db.update(orders)
    .set({ molliePaymentId: payment.id })
    .where(eq(orders.id, order.id))

  return {
    orderId: order.id,
    checkoutUrl: payment.links?.checkout?.href ?? null
  }
})
