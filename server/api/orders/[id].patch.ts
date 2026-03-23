import { z } from 'zod'
import { eq, inArray } from 'drizzle-orm'
import { orders, orderItems, photos, pricingFormulas } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { getPhotoPriceCents } from '~~/server/utils/settings'

const VALID_STATUSES = ['pending', 'paid', 'cancelled', 'expired', 'failed'] as const

const VALID_BUSINESS_STATUSES = ['in_progress', 'completed'] as const

const bodySchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  businessStatus: z.enum(VALID_BUSINESS_STATUSES).optional(),
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  formulaId: z.string().uuid().nullable().optional(),
  photoIds: z.array(z.string().uuid()).max(100).optional(),
  photoFilenames: z.array(z.object({
    filename: z.string().min(1).max(255),
    collectionId: z.string().uuid().nullable().optional()
  })).optional(),
  amazonLink: z.string().url().max(1000).nullable().optional()
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, bodySchema.parse)

  const [existing] = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Commande introuvable' })
  }

  // Update order fields
  const orderUpdate: Record<string, unknown> = { updatedAt: new Date() }
  if (body.status) orderUpdate.status = body.status
  if (body.businessStatus) orderUpdate.businessStatus = body.businessStatus
  if (body.firstName) orderUpdate.firstName = body.firstName
  if (body.lastName) orderUpdate.lastName = body.lastName
  if (body.email) orderUpdate.email = body.email
  if (body.amazonLink !== undefined) orderUpdate.amazonLink = body.amazonLink

  // Handle formula + photos change
  const hasPhotoChanges = body.photoIds !== undefined || body.photoFilenames !== undefined
  if (hasPhotoChanges) {
    const linkedPhotoIds = body.photoIds ?? []
    const deferredItems = body.photoFilenames ?? []
    const totalItems = linkedPhotoIds.length + deferredItems.length

    // Validate linked photos
    if (linkedPhotoIds.length > 0) {
      const foundPhotos = await db.select({ id: photos.id, filename: photos.filename })
        .from(photos)
        .where(inArray(photos.id, linkedPhotoIds))
      if (foundPhotos.length !== linkedPhotoIds.length) {
        throw createError({ statusCode: 400, message: 'Certaines photos sont introuvables' })
      }
    }

    // Resolve formula for pricing
    let totalCents: number
    let priceCentsPerItem: number
    let formulaName: string | null = existing.formulaName

    if (body.formulaId !== undefined) {
      if (body.formulaId) {
        const [formula] = await db.select().from(pricingFormulas)
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
        // No formula
        priceCentsPerItem = await getPhotoPriceCents()
        totalCents = totalItems * priceCentsPerItem
        formulaName = null
      }
    } else {
      // Keep existing formula pricing logic — recalculate with new count
      priceCentsPerItem = await getPhotoPriceCents()
      totalCents = totalItems * priceCentsPerItem
    }

    orderUpdate.totalCents = totalCents
    orderUpdate.formulaName = formulaName

    // Delete all existing items and re-insert
    await db.delete(orderItems).where(eq(orderItems.orderId, id))

    const itemValues = []

    // Insert items for linked photos
    if (linkedPhotoIds.length > 0) {
      const foundPhotos = await db.select({ id: photos.id, filename: photos.filename })
        .from(photos)
        .where(inArray(photos.id, linkedPhotoIds))
      const filenameMap = Object.fromEntries(foundPhotos.map(p => [p.id, p.filename]))

      for (const photoId of linkedPhotoIds) {
        itemValues.push({
          orderId: id,
          photoId,
          photoFilename: filenameMap[photoId] ?? null,
          priceCents: priceCentsPerItem
        })
      }
    }

    // Insert items for deferred filenames
    for (const item of deferredItems) {
      itemValues.push({
        orderId: id,
        photoId: null,
        photoFilename: item.filename,
        collectionId: item.collectionId ?? null,
        priceCents: priceCentsPerItem
      })
    }

    if (itemValues.length > 0) {
      await db.insert(orderItems).values(itemValues)
    }
  } else if (body.formulaId !== undefined) {
    // Formula changed but photos not — just update formula name
    if (body.formulaId) {
      const [formula] = await db.select().from(pricingFormulas)
        .where(eq(pricingFormulas.id, body.formulaId))
      if (formula) orderUpdate.formulaName = formula.name
    } else {
      orderUpdate.formulaName = null
    }
  }

  const [updated] = await db.update(orders)
    .set(orderUpdate)
    .where(eq(orders.id, id))
    .returning()

  return updated
})
