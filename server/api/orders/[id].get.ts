import { eq } from 'drizzle-orm'
import { orders, orderItems, photos } from '~~/server/database/schema'
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
    .select({ photo: photos })
    .from(orderItems)
    .innerJoin(photos, eq(orderItems.photoId, photos.id))
    .where(eq(orderItems.orderId, order.id))

  const photosWithUrls = await Promise.all(
    items.map(async ({ photo }) => ({
      id: photo.id,
      filename: photo.filename,
      url: await blobPresignedUrl(photo.key)
    }))
  )

  return { ...order, photos: photosWithUrls }
})
