import { z } from 'zod'
import { eq, sql, inArray } from 'drizzle-orm'
import { photos, orders, orderItems, pricingFormulas, promoCodes } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { getPhotoPriceCents } from '~~/server/utils/settings'

const bodySchema = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  email: z.string().email(),
  photoIds: z.array(z.string().uuid()).min(1).max(500),
  formulaId: z.string().uuid().optional(),
  paymentMethod: z.enum(['online', 'cash']).default('online'),
  promoCode: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(255).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(255).optional(),
  printPhotoId: z.string().uuid().optional()
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)
  const config = useRuntimeConfig()
  const appUrl = config.appUrl as string

  // Validate photos exist
  const foundPhotos = await db.select({ id: photos.id, filename: photos.filename })
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
    priceCentsPerItem = await getPhotoPriceCents()
    totalCents = body.photoIds.length * priceCentsPerItem
  }

  // Apply promo code
  let discountCents = 0
  let appliedPromoCode: string | undefined

  if (body.promoCode) {
    const code = body.promoCode.toUpperCase()
    const [promo] = await db.select().from(promoCodes)
      .where(eq(promoCodes.code, code)).limit(1)

    if (!promo || !promo.isActive || promo.usageCount >= promo.maxUsage) {
      throw createError({ statusCode: 400, message: 'Code promo invalide ou expiré' })
    }

    if (promo.formulaId && promo.formulaId !== body.formulaId) {
      throw createError({ statusCode: 400, message: 'Ce code promo n\'est pas valable pour cette formule' })
    }

    if (promo.type === 'percentage') {
      discountCents = Math.round(totalCents * promo.value / 100)
    } else {
      discountCents = Math.min(promo.value, totalCents)
    }

    totalCents = totalCents - discountCents
    appliedPromoCode = code

    await db.update(promoCodes)
      .set({ usageCount: sql`${promoCodes.usageCount} + 1`, updatedAt: new Date() })
      .where(eq(promoCodes.id, promo.id))
  }

  // Prevent negative total (security: server-side recalculation of discount)
  if (totalCents < 0) totalCents = 0

  // Only block 0€ orders without a promo code (no free orders without justification)
  if (totalCents === 0 && !appliedPromoCode) {
    throw createError({ statusCode: 400, message: 'Le montant doit être supérieur à 0' })
  }

  // Free order (100% promo) — mark as paid immediately, no payment needed
  const isFreeOrder = totalCents === 0

  // Validate printPhotoId belongs to this order's photos
  const printPhotoId = body.printPhotoId && body.photoIds.includes(body.printPhotoId)
    ? body.printPhotoId
    : null

  const result = await db.insert(orders).values({
    email: body.email,
    firstName: body.firstName,
    lastName: body.lastName,
    address: body.address,
    city: body.city,
    postalCode: body.postalCode,
    country: body.country,
    promoCode: appliedPromoCode,
    discountCents,
    totalCents,
    formulaName,
    cashPayment: body.paymentMethod === 'cash',
    createdByAdmin: false,
    status: isFreeOrder ? 'paid' : 'pending',
    printPhotoId
  }).returning()

  const order = result[0]
  if (!order) throw createError({ statusCode: 500, message: 'Erreur lors de la création de la commande' })

  await db.insert(orderItems).values(
    body.photoIds.map(photoId => ({ orderId: order.id, photoId, priceCents: priceCentsPerItem }))
  )

  // Send confirmation email (non-blocking)
  sendOrderConfirmationEmail({
    to: body.email,
    firstName: body.firstName,
    orderId: order.id,
    photoCount: body.photoIds.length,
    totalCents,
    formulaName: formulaName ?? null,
    filenames: foundPhotos.map(p => p.filename),
    cashPayment: body.paymentMethod === 'cash',
    isFree: isFreeOrder
  }).catch(() => {})

  // Free order — no payment required
  if (isFreeOrder) {
    return { checkoutUrl: null, orderId: order.id, free: true }
  }

  // Cash payment — no Mollie
  if (body.paymentMethod === 'cash') {
    return { checkoutUrl: null, orderId: order.id, free: false }
  }

  // Online payment requires address
  if (body.paymentMethod === 'online' && (!body.address || !body.city || !body.postalCode || !body.country)) {
    throw createError({ statusCode: 400, message: 'L\'adresse postale est requise pour un paiement en ligne' })
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

  return { checkoutUrl, orderId: order.id, free: false }
})
