import { eq, and } from 'drizzle-orm'
import { collections, photos } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const [collection] = await db.select()
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.visible, true)))
    .limit(1)

  if (!collection) {
    throw createError({ statusCode: 404, message: 'Collection introuvable' })
  }

  const collectionPhotos = await db.select()
    .from(photos)
    .where(eq(photos.collectionId, id))
    .orderBy(photos.createdAt)

  const photosWithUrls = await Promise.all(
    collectionPhotos.map(async (photo) => ({
      ...photo,
      url: await blobPresignedUrl(photo.key)
    }))
  )

  return { ...collection, photos: photosWithUrls }
})
