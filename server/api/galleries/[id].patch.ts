import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { galleries } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

const bodySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  code: z.string().min(1).max(100).optional(),
  link: z.string().url().max(1000).optional(),
  date: z.string().max(20).nullable().optional()
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, bodySchema.parse)

  const [existing] = await db.select().from(galleries).where(eq(galleries.id, id)).limit(1)
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Galerie introuvable' })
  }

  const update: Record<string, unknown> = {}
  if (body.title !== undefined) update.title = body.title
  if (body.code !== undefined) update.code = body.code.toLowerCase()
  if (body.link !== undefined) update.link = body.link
  if (body.date !== undefined) update.date = body.date

  const [updated] = await db.update(galleries)
    .set(update)
    .where(eq(galleries.id, id))
    .returning()

  return updated
})