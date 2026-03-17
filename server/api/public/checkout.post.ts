import { z } from 'zod'
import { eq, inArray } from 'drizzle-orm'
import { photos, orders, orderItems, pricingFormulas } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

const bodySchema = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  email: z.string().email(),
  photoIds: z.array(z.string().uuid()).min(1).max(500),
  formulaId: z.string().uuid().optional(),
  paymentMethod: z.enum(['online', 'cash']).default('online')
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)
  const config = useRuntimeConfig()
  const appUrl = config.appUrl as string

  // Validate photos exist
  const foundPhotos = await db.select({ id: photos.id })
    .from(photos)
    .where(inArray(photos.id, body.photoIds))

  if (foundPhotos.length !== body.photoIds.length) {
    throw createError({ statusCode: 400, message: 'Certaines photos sont introuvables' })
  }

  // Calculate total
  let totalCents: number
  let priceCentsPerItem: number
  let formulaName: string | undefined

  if (body.formulaId) {
    const [formula] = await db.select()
      .from(pricingFormulas)
      .where(eq(pricingFormulas.id, body.formulaId))

    if (!formula?.isActive) {
      throw createError({ statusCode: 400, message: 'Formule introuvable ou inactive' })
    }

    const extra = Math.max(0, body.photoIds.length - formula.digitalPhotosCount)
    const extraCost = formula.extraPhotoPriceCents != null
      ? extra * formula.extraPhotoPriceCents
      : 0
    totalCents = formula.basePriceCents + extraCost
    priceCentsPerItem = Math.round(totalCents / body.photoIds.length)
    formulaName = formula.name
  } else {
    priceCentsPerItem = Number(config.public.photoPriceCents ?? 500)
    totalCents = body.photoIds.length * priceCentsPerItem
  }

  if (totalCents <= 0) {
    throw createError({ statusCode: 400, message: 'Le montant doit être supérieur à 0' })
  }

  const result = await db.insert(orders).values({
    email: body.email,
    firstName: body.firstName,
    lastName: body.lastName,
    totalCents,
    formulaName,
    status: body.paymentMethod === 'cash' ? 'cash' : 'pending'
  }).returning()

  const order = result[0]
  if (!order) throw createError({ statusCode: 500, message: 'Erreur lors de la création de la commande' })

  await db.insert(orderItems).values(
    body.photoIds.map(photoId => ({ orderId: order.id, photoId, priceCents: priceCentsPerItem }))
  )

  // Cash payment — no Mollie
  if (body.paymentMethod === 'cash') {
    return { checkoutUrl: null, orderId: order.id }
  }

  const mollie = getMollie()
  const payment = await mollie.payments.create({
    paymentRequest: {
      description: `Commande Len-Art #${order.id.slice(0, 8)}`,
      amount: { currency: 'EUR', value: (totalCents / 100).toFixed(2) },
      redirectUrl: `${appUrl}/commande/succes?orderId=${order.id}`,
      cancelUrl: `${appUrl}/commande/annule?orderId=${order.id}`,
      webhookUrl: `${appUrl}/api/public/webhooks/mollie`,
      locale: 'fr_FR',
      metadata: { orderId: order.id }
    }
  })

  const checkoutUrl = payment.links?.checkout?.href
  if (!checkoutUrl) throw createError({ statusCode: 500, message: 'Impossible de créer le paiement' })

  await db.update(orders).set({ molliePaymentId: payment.id }).where(eq(orders.id, order.id))

  return { checkoutUrl, orderId: order.id }
})
