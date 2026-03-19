import { z } from 'zod'
import { eq, and, isNull } from 'drizzle-orm'
import { orders, orderItems, photos, pricingFormulas } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { getPhotoPriceCents } from '~~/server/utils/settings'

const VALID_STATUSES = ['pending', 'paid', 'cancelled', 'expired', 'failed'] as const

const bodySchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  formulaId: z.string().uuid().nullable().optional(),
  photoFilenames: z.array(z.string().min(1).max(255)).optional()
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
  if (body.firstName) orderUpdate.firstName = body.firstName
  if (body.lastName) orderUpdate.lastName = body.lastName
  if (body.email) orderUpdate.email = body.email

  // Handle formula + photos change
  if (body.photoFilenames !== undefined) {
    const filenames = body.photoFilenames

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
        const extra = Math.max(0, filenames.length - formula.digitalPhotosCount)
        const extraCost = formula.extraPhotoPriceCents != null
          ? extra * formula.extraPhotoPriceCents
          : 0
        totalCents = formula.basePriceCents + extraCost
        priceCentsPerItem = filenames.length > 0 ? Math.round(totalCents / filenames.length) : 0
        formulaName = formula.name
      } else {
        // No formula
        priceCentsPerItem = await getPhotoPriceCents()
        totalCents = filenames.length * priceCentsPerItem
        formulaName = null
      }
    } else {
      // Keep existing formula pricing logic — recalculate with new count
      priceCentsPerItem = await getPhotoPriceCents()
      totalCents = filenames.length * priceCentsPerItem
    }

    orderUpdate.totalCents = totalCents
    orderUpdate.formulaName = formulaName

    // Get existing items to preserve photo links
    const existingItems = await db.select({
      id: orderItems.id,
      photoId: orderItems.photoId,
      photoFilename: orderItems.photoFilename
    }).from(orderItems).where(eq(orderItems.orderId, id))

    // Build a map of filename -> existing photoId (to preserve links)
    const linkedMap = new Map<string, string>()
    for (const item of existingItems) {
      if (item.photoFilename && item.photoId) {
        linkedMap.set(item.photoFilename, item.photoId)
      }
    }

    // Delete all existing items and re-insert
    await db.delete(orderItems).where(eq(orderItems.orderId, id))

    if (filenames.length > 0) {
      const newItems = filenames.map(filename => ({
        orderId: id,
        photoId: linkedMap.get(filename) ?? null,
        photoFilename: filename,
        priceCents: priceCentsPerItem
      }))
      await db.insert(orderItems).values(newItems)

      // Try to auto-link any unlinked items
      for (const item of newItems) {
        if (!item.photoId && item.photoFilename) {
          const [photo] = await db.select({ id: photos.id })
            .from(photos)
            .where(eq(photos.filename, item.photoFilename))
            .limit(1)
          if (photo) {
            await db.update(orderItems)
              .set({ photoId: photo.id })
              .where(and(
                eq(orderItems.orderId, id),
                eq(orderItems.photoFilename, item.photoFilename),
                isNull(orderItems.photoId)
              ))
          }
        }
      }
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
