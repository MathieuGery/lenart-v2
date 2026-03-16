import { desc, count, eq } from 'drizzle-orm'
import { collections, photos } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async () => {
  const rows = await db
    .select({
      id: collections.id,
      name: collections.name,
      description: collections.description,
      createdAt: collections.createdAt,
      photoCount: count(photos.id)
    })
    .from(collections)
    .leftJoin(photos, eq(photos.collectionId, collections.id))
    .groupBy(collections.id)
    .orderBy(desc(collections.createdAt))

  return rows
})
