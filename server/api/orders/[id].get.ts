import { eq } from 'drizzle-orm'
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
      photo: photos,
      collectionName: collections.name
    })
    .from(orderItems)
    .leftJoin(photos, eq(orderItems.photoId, photos.id))
    .leftJoin(collections, eq(photos.collectionId, collections.id))
    .where(eq(orderItems.orderId, order.id))

  const orderPhotos = await Promise.all(
    items.map(async ({ itemId, photoId, photoFilename, photo, collectionName }) => ({
      itemId,
      id: photoId,
      filename: photo?.filename ?? photoFilename,
      linked: !!photoId,
      collectionName: collectionName ?? null,
      url: photo ? await blobPresignedUrl(photo.key) : null
    }))
  )

  return { ...order, photos: orderPhotos }
})
