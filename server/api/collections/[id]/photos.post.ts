import { randomUUID, createHash } from 'node:crypto'
import { eq, and } from 'drizzle-orm'
import { collections, photos } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { applyWatermark } from '~~/server/utils/watermark'

export default defineEventHandler(async (event) => {
  const collectionId = getRouterParam(event, 'id')!

  const [collection] = await db.select({ id: collections.id })
    .from(collections)
    .where(eq(collections.id, collectionId))
    .limit(1)

  if (!collection) {
    throw createError({ statusCode: 404, message: 'Collection introuvable' })
  }

  const form = await readMultipartFormData(event)
  if (!form || form.length === 0) {
    throw createError({ statusCode: 400, message: 'Aucun fichier' })
  }

  const files = form.filter(f => f.name === 'files' && f.data && f.type)
  if (files.length === 0) {
    throw createError({ statusCode: 400, message: 'Aucun fichier valide' })
  }

  const uploaded = []
  const duplicates: string[] = []

  for (const file of files) {
    const hash = createHash('sha256').update(file.data).digest('hex')

    const [existing] = await db.select({ id: photos.id })
      .from(photos)
      .where(and(eq(photos.collectionId, collectionId), eq(photos.hash, hash)))
      .limit(1)

    if (existing) {
      duplicates.push(file.filename || 'unknown')
      continue
    }

    const ext = file.filename?.split('.').pop() || 'jpg'
    const key = `collections/${collectionId}/${randomUUID()}.${ext}`

    const watermarked = await applyWatermark(file.data)
    await blobPut(key, watermarked, 'image/jpeg')

    const [photo] = await db.insert(photos)
      .values({
        collectionId,
        key,
        filename: file.filename || `photo.${ext}`,
        hash,
        size: watermarked.length
      })
      .returning()

    const url = await blobPresignedUrl(key)
    uploaded.push({ ...photo, url })
  }

  return { uploaded, duplicates }
})
