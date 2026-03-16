import { eq } from 'drizzle-orm'
import { photos } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const [photo] = await db.select()
    .from(photos)
    .where(eq(photos.id, id))
    .limit(1)

  if (!photo) {
    throw createError({ statusCode: 404, message: 'Photo introuvable' })
  }

  await blobDelete(photo.key)
  await db.delete(photos).where(eq(photos.id, id))

  return { deleted: id }
})
