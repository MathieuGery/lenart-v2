import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { collections } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

const bodySchema = z.object({
  visible: z.boolean().optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional()
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, bodySchema.parse)

  const [updated] = await db.update(collections)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(collections.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Collection introuvable' })
  }

  return updated
})
