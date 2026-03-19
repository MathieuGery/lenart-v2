import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { promoCodes } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

const bodySchema = z.object({
  code: z.string().min(1).max(50).optional(),
  type: z.enum(['percentage', 'fixed']).optional(),
  value: z.number().int().min(1).optional(),
  maxUsage: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  formulaId: z.string().uuid().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, bodySchema.parse)

  const [existing] = await db.select().from(promoCodes).where(eq(promoCodes.id, id)).limit(1)
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Code promo introuvable' })
  }

  const update: Record<string, unknown> = { updatedAt: new Date() }
  if (body.code !== undefined) update.code = body.code.toUpperCase()
  if (body.type !== undefined) update.type = body.type
  if (body.value !== undefined) update.value = body.value
  if (body.maxUsage !== undefined) update.maxUsage = body.maxUsage
  if (body.isActive !== undefined) update.isActive = body.isActive
  if (body.formulaId !== undefined) update.formulaId = body.formulaId

  const [updated] = await db.update(promoCodes)
    .set(update)
    .where(eq(promoCodes.id, id))
    .returning()

  return updated
})
