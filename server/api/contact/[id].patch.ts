import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { contactMessages } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

const bodySchema = z.object({
  status: z.enum(['new', 'read', 'archived'])
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const { status } = await readValidatedBody(event, bodySchema.parse)

  const [updated] = await db.update(contactMessages)
    .set({ status })
    .where(eq(contactMessages.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Message introuvable' })
  }

  return updated
})
