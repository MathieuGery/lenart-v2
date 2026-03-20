import { eq } from 'drizzle-orm'
import { collections, photos } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const collectionPhotos = await db.select({ key: photos.key })
    .from(photos)
    .where(eq(photos.collectionId, id))

  try {
    await db.delete(collections).where(eq(collections.id, id))
  } catch {
    throw createError({ statusCode: 409, message: 'Cette collection contient des photos liées à des commandes et ne peut pas être supprimée' })
  }

  for (const photo of collectionPhotos) {
    await blobDelete(photo.key)
  }

  return { deleted: id }
})
