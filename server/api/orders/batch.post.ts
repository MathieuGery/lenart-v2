import { z } from 'zod'
import { eq, sql, inArray } from 'drizzle-orm'
import { photos, orders, orderItems, pricingFormulas, promoCodes } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { getPhotoPriceCents } from '~~/server/utils/settings'

const subOrderSchema = z.object({
  photoIds: z.array(z.string().uuid()).max(100).optional(),
  photoFilenames: z.array(z.object({
    filename: z.string().min(1).max(255),
    collectionId: z.string().uuid().nullable().optional()
  })).max(100).optional(),
  formulaId: z.string().uuid().optional(),
  printPhotoId: z.string().uuid().optional(),
  printPhotoFilename: z.string().max(255).optional()
}).refine(d => (d.photoIds?.length ?? 0) + (d.photoFilenames?.length ?? 0) > 0, {
  message: 'Au moins une photo ou un nom de fichier requis par commande'
})

const bodySchema = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  email: z.string().email(),
  subOrders: z.array(subOrderSchema).min(1).max(20),
  promoCode: z.string().max(50).optional(),
  paymentMethod: z.enum(['link', 'terminal', 'cash']),
  terminalId: z.string().optional()
}).refine(d => d.paymentMethod !== 'terminal' || !!d.terminalId, {
  message: 'terminalId requis pour le paiement par terminal',
  path: ['terminalId']
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)
  const appUrl = process.env.NUXT_APP_URL ?? 'https://v2.len-art.fr'

  // Resolve promo code once for all sub-orders
  let promoDiscount: { type: 'percentage' | 'fixed', value: number, code: string, id: string } | null = null
  if (body.promoCode) {
    const code = body.promoCode.toUpperCase()
    const [promo] = await db.select().from(promoCodes)
      .where(eq(promoCodes.code, code)).limit(1)

    if (!promo || !promo.isActive || promo.usageCount >= promo.maxUsage) {
      throw createError({ statusCode: 400, message: 'Code promo invalide ou expiré' })
    }

    // For batch orders with formula-specific promo, validate that at least one sub-order uses the formula
    if (promo.formulaId) {
      const hasMatchingFormula = body.subOrders.some(so => so.formulaId === promo.formulaId)
      if (!hasMatchingFormula) {
        throw createError({ statusCode: 400, message: 'Ce code promo n\'est pas valable pour ces formules' })
      }
    }

    promoDiscount = { type: promo.type as 'percentage' | 'fixed', value: promo.value, code, id: promo.id }
  }

  // Process each sub-order
  const createdOrders: { id: string, totalCents: number, allFilenames: string[] }[] = []
  let grandTotalBeforeDiscount = 0

  for (const subOrder of body.subOrders) {
    const linkedPhotoIds = subOrder.photoIds ?? []
    if (linkedPhotoIds.length > 0) {
      const foundPhotos = await db
        .select({ id: photos.id })
        .from(photos)
        .where(inArray(photos.id, linkedPhotoIds))
      if (foundPhotos.length !== linkedPhotoIds.length) {
        throw createError({ statusCode: 400, message: 'Certaines photos sont introuvables' })
      }
    }

    const deferredItems = subOrder.photoFilenames ?? []
    const totalItems = linkedPhotoIds.length + deferredItems.length

    let totalCents: number
    let priceCentsPerItem: number
    let formulaName: string | undefined

    if (subOrder.formulaId) {
      const [formula] = await db.select()
        .from(pricingFormulas)
        .where(eq(pricingFormulas.id, subOrder.formulaId))
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

    grandTotalBeforeDiscount += totalCents

    // Create the order (totalCents will be adjusted after discount calculation)
    const [order] = await db.insert(orders).values({
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      totalCents,
      formulaName,
      cashPayment: body.paymentMethod === 'cash',
      createdByAdmin: true,
      status: 'pending',
      printPhotoId: subOrder.printPhotoId ?? null,
      printPhotoFilename: subOrder.printPhotoFilename ?? null
    }).returning()

    if (!order) {
      throw createError({ statusCode: 500, message: 'Erreur lors de la création de la commande' })
    }

    // Insert order items
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

    const allFilenames = itemValues
      .map(i => i.photoFilename)
      .filter((f): f is string => !!f)

    createdOrders.push({ id: order.id, totalCents, allFilenames })
  }

  // Apply promo code (to the grand total, then distribute proportionally)
  let discountCents = 0
  if (promoDiscount) {
    if (promoDiscount.type === 'percentage') {
      discountCents = Math.round(grandTotalBeforeDiscount * promoDiscount.value / 100)
    } else {
      discountCents = Math.min(promoDiscount.value, grandTotalBeforeDiscount)
    }

    // Distribute discount proportionally across orders
    let remainingDiscount = discountCents
    for (let i = 0; i < createdOrders.length; i++) {
      const orderData = createdOrders[i]
      const proportion = grandTotalBeforeDiscount > 0
        ? orderData.totalCents / grandTotalBeforeDiscount
        : 1 / createdOrders.length
      const orderDiscount = i === createdOrders.length - 1
        ? remainingDiscount // last order gets the remainder
        : Math.round(discountCents * proportion)
      remainingDiscount -= orderDiscount

      const newTotal = Math.max(0, orderData.totalCents - orderDiscount)
      orderData.totalCents = newTotal

      await db.update(orders).set({
        totalCents: newTotal,
        promoCode: promoDiscount.code,
        discountCents: orderDiscount
      }).where(eq(orders.id, orderData.id))
    }

    await db.update(promoCodes)
      .set({ usageCount: sql`${promoCodes.usageCount} + 1`, updatedAt: new Date() })
      .where(eq(promoCodes.id, promoDiscount.id))
  }

  const grandTotal = createdOrders.reduce((sum, o) => sum + o.totalCents, 0)

  // Send confirmation emails (non-blocking)
  for (const orderData of createdOrders) {
    sendOrderConfirmationEmail({
      to: body.email,
      firstName: body.firstName,
      orderId: orderData.id,
      photoCount: orderData.allFilenames.length,
      totalCents: orderData.totalCents,
      formulaName: null,
      filenames: orderData.allFilenames,
      cashPayment: body.paymentMethod === 'cash',
      isFree: false
    }).catch(() => {})
  }

  const orderIds = createdOrders.map(o => o.id)

  // Free order (100% promo)
  if (grandTotal === 0 && promoDiscount) {
    await db.update(orders).set({ status: 'paid' }).where(inArray(orders.id, orderIds))
    return { orderIds, checkoutUrl: null }
  }

  // Cash payment
  if (body.paymentMethod === 'cash') {
    return { orderIds, checkoutUrl: null }
  }

  // Create a single Mollie payment for all orders
  const mollie = getMollie()
  const description = createdOrders.length === 1
    ? `Commande Len-Art #${orderIds[0].slice(0, 8)}`
    : `${createdOrders.length} commandes Len-Art`
  const euros = (grandTotal / 100).toFixed(2)

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
        metadata: { orderIds }
      }
    })
  } else {
    payment = await mollie.payments.create({
      paymentRequest: {
        description,
        amount: { currency: 'EUR', value: euros },
        redirectUrl: `${appUrl}/commande/succes?orderId=${orderIds[0]}`,
        cancelUrl: `${appUrl}/commande/annule?orderId=${orderIds[0]}`,
        webhookUrl: `${appUrl}/api/public/webhooks/mollie`,
        locale: 'fr_FR',
        metadata: { orderIds }
      }
    })
  }

  // Set the same molliePaymentId on all orders
  await db.update(orders)
    .set({ molliePaymentId: payment.id })
    .where(inArray(orders.id, orderIds))

  return {
    orderIds,
    checkoutUrl: payment.links?.checkout?.href ?? null
  }
})
