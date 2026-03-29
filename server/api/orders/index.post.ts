import { z } from 'zod'
import { eq, sql, inArray } from 'drizzle-orm'
import { photos, orders, orderItems, pricingFormulas, promoCodes } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { getPhotoPriceCents } from '~~/server/utils/settings'

const bodySchema = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  email: z.string().email(),
  photoIds: z.array(z.string().uuid()).max(100).optional(),
  photoFilenames: z.array(z.object({
    filename: z.string().min(1).max(255),
    collectionId: z.string().uuid().nullable().optional()
  })).max(100).optional(),
  formulaId: z.string().uuid().optional(),
  promoCode: z.string().max(50).optional(),
  paymentMethod: z.enum(['link', 'terminal', 'cash']),
  terminalId: z.string().optional()
}).refine(d => d.paymentMethod !== 'terminal' || !!d.terminalId, {
  message: 'terminalId requis pour le paiement par terminal',
  path: ['terminalId']
}).refine(d => (d.photoIds?.length ?? 0) + (d.photoFilenames?.length ?? 0) > 0, {
  message: 'Au moins une photo ou un nom de fichier requis'
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)

  const appUrl = process.env.NUXT_APP_URL ?? 'https://v2.len-art.fr'

  // Validate existing photos if any
  const linkedPhotoIds = body.photoIds ?? []
  if (linkedPhotoIds.length > 0) {
    const foundPhotos = await db
      .select({ id: photos.id, filename: photos.filename })
      .from(photos)
      .where(inArray(photos.id, linkedPhotoIds))

    if (foundPhotos.length !== linkedPhotoIds.length) {
      throw createError({ statusCode: 400, message: 'Certaines photos sont introuvables' })
    }
  }

  const deferredItems = body.photoFilenames ?? []
  const totalItems = linkedPhotoIds.length + deferredItems.length

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

    const extra = Math.max(0, totalItems - formula.digitalPhotosCount)
    const extraCost = formula.extraPhotoPriceCents != null
      ? extra * formula.extraPhotoPriceCents
      : 0
    totalCents = formula.basePriceCents + extraCost
    priceCentsPerItem = totalItems > 0 ? Math.round(totalCents / totalItems) : 0
    formulaName = formula.name
  } else {
    priceCentsPerItem = await getPhotoPriceCents()
    totalCents = totalItems * priceCentsPerItem
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

  if (totalCents < 0) totalCents = 0

  // Create order
  const [order] = await db.insert(orders).values({
    email: body.email,
    firstName: body.firstName,
    lastName: body.lastName,
    totalCents,
    formulaName,
    promoCode: appliedPromoCode,
    discountCents,
    cashPayment: body.paymentMethod === 'cash',
    status: 'pending'
  }).returning()

  if (!order) {
    throw createError({ statusCode: 500, message: 'Erreur lors de la création de la commande' })
  }

  // Insert order items for linked photos
  const itemValues = []

  if (linkedPhotoIds.length > 0) {
    const foundPhotos = await db.select({ id: photos.id, filename: photos.filename })
      .from(photos)
      .where(inArray(photos.id, linkedPhotoIds))
    const filenameMap = Object.fromEntries(foundPhotos.map(p => [p.id, p.filename]))

    for (const photoId of linkedPhotoIds) {
      itemValues.push({
        orderId: order.id,
        photoId,
        photoFilename: filenameMap[photoId] ?? null,
        priceCents: priceCentsPerItem
      })
    }
  }

  // Insert order items for filenames (deferred linking — resolved on photo upload)
  for (const item of deferredItems) {
    itemValues.push({
      orderId: order.id,
      photoId: null,
      photoFilename: item.filename,
      collectionId: item.collectionId ?? null,
      priceCents: priceCentsPerItem
    })
  }

  if (itemValues.length > 0) {
    await db.insert(orderItems).values(itemValues)
  }

  // Collect all filenames for the email
  const allFilenames = itemValues
    .map(i => i.photoFilename)
    .filter((f): f is string => !!f)

  // Send confirmation email (non-blocking)
  sendOrderConfirmationEmail({
    to: body.email,
    firstName: body.firstName,
    orderId: order.id,
    photoCount: totalItems,
    totalCents,
    formulaName: formulaName ?? null,
    filenames: allFilenames,
    cashPayment: body.paymentMethod === 'cash',
    isFree: false
  }).catch(() => {})

  // Free order (100% promo) — mark as paid immediately
  if (totalCents === 0 && appliedPromoCode) {
    await db.update(orders).set({ status: 'paid' }).where(eq(orders.id, order.id))
    return { orderId: order.id, checkoutUrl: null }
  }

  // Cash payment — no Mollie involved
  if (body.paymentMethod === 'cash') {
    return { orderId: order.id, checkoutUrl: null }
  }

  // Create Mollie payment
  const mollie = getMollie()
  const description = `Commande Len-Art #${order.id.slice(0, 8)}`
  const euros = (totalCents / 100).toFixed(2)

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
