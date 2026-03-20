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

  try {
    await db.delete(photos).where(eq(photos.id, id))
  } catch {
    throw createError({ statusCode: 409, message: 'Cette photo est liée à une commande et ne peut pas être supprimée' })
  }

  await blobDelete(photo.key)

  return { deleted: id }
})
