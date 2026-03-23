import { eq, inArray } from 'drizzle-orm'
import { orders, orderItems, photos, collections } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const [order] = await db.select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1)

  if (!order) {
    throw createError({ statusCode: 404, message: 'Commande introuvable' })
  }

  const items = await db
    .select({
      itemId: orderItems.id,
      photoId: orderItems.photoId,
      photoFilename: orderItems.photoFilename,
      itemCollectionId: orderItems.collectionId,
      photo: photos,
      collectionName: collections.name
    })
    .from(orderItems)
    .leftJoin(photos, eq(orderItems.photoId, photos.id))
    .leftJoin(collections, eq(photos.collectionId, collections.id))
    .where(eq(orderItems.orderId, order.id))

  // Resolve collection names for unlinked items with a collectionId
  const unlinkedCollectionIds = items
    .filter(i => !i.photoId && i.itemCollectionId)
    .map(i => i.itemCollectionId!)
  const collectionNameMap = new Map<string, string>()
  if (unlinkedCollectionIds.length > 0) {
    const cols = await db.select({ id: collections.id, name: collections.name })
      .from(collections)
      .where(inArray(collections.id, [...new Set(unlinkedCollectionIds)]))
    for (const c of cols) collectionNameMap.set(c.id, c.name)
  }

  const orderPhotos = await Promise.all(
    items.map(async ({ itemId, photoId, photoFilename, itemCollectionId, photo, collectionName }) => ({
      itemId,
      id: photoId,
      filename: photo?.filename ?? photoFilename,
      linked: !!photoId,
      collectionId: photo?.collectionId ?? itemCollectionId ?? null,
      collectionName: collectionName ?? collectionNameMap.get(itemCollectionId!) ?? null,
      url: photo ? await blobPresignedUrl(photo.key) : null
    }))
  )

  return { ...order, photos: orderPhotos }
})
