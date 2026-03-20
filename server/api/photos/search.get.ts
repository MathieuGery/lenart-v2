import { and, eq, ilike } from 'drizzle-orm'
import { photos, collections } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = (query.q as string || '').trim()
  const collectionId = query.collectionId as string | undefined

  if (!q || q.length < 2) return []

  const conditions = [ilike(photos.filename, `%${q}%`)]
  if (collectionId) {
    conditions.push(eq(photos.collectionId, collectionId))
  }

  const results = await db
    .select({
      id: photos.id,
      filename: photos.filename,
      collectionId: photos.collectionId,
      collectionName: collections.name
    })
    .from(photos)
    .innerJoin(collections, eq(photos.collectionId, collections.id))
    .where(and(...conditions))
    .limit(20)

  return results
})
