import { collections } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.name?.trim()) {
    throw createError({ statusCode: 400, message: 'Nom requis' })
  }

  const [collection] = await db.insert(collections)
    .values({
      name: body.name.trim(),
      description: body.description?.trim() || null
    })
    .returning()

  return collection
})
