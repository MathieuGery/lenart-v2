import { eq } from 'drizzle-orm'
import { photos } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const collectionId = getRouterParam(event, 'id')!

  const allPhotos = await db.select({ id: photos.id, key: photos.key })
    .from(photos)
    .where(eq(photos.collectionId, collectionId))

  if (!allPhotos.length) return { deleted: 0 }

  let deleted = 0

  for (const photo of allPhotos) {
    try {
      // If photo is linked to an order_item, the FK constraint will throw — we skip it
      await db.delete(photos).where(eq(photos.id, photo.id))
      // Only reached if DB delete succeeded
      await blobDelete(photo.key)
      deleted++
    } catch {
      // Photo is referenced by an order — leave it intact
    }
  }

  return { deleted }
})
