import { desc, count, eq, asc, sql } from 'drizzle-orm'
import { collections, photos } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async () => {
  const firstPhotoKey = db
    .select({ key: photos.key })
    .from(photos)
    .where(eq(photos.collectionId, collections.id))
    .orderBy(asc(photos.createdAt))
    .limit(1)

  const rows = await db
    .select({
      id: collections.id,
      name: collections.name,
      description: collections.description,
      createdAt: collections.createdAt,
      photoCount: count(photos.id),
      coverKey: sql<string | null>`(${firstPhotoKey})`
    })
    .from(collections)
    .leftJoin(photos, eq(photos.collectionId, collections.id))
    .groupBy(collections.id)
    .orderBy(desc(collections.createdAt))

  return Promise.all(
    rows.map(async ({ coverKey, ...row }) => ({
      ...row,
      coverUrl: coverKey ? await blobPresignedUrl(coverKey) : null
    }))
  )
})
