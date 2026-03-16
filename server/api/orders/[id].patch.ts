import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { orders } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

const VALID_STATUSES = ['pending', 'paid', 'cancelled', 'expired', 'failed'] as const

const bodySchema = z.object({
  status: z.enum(VALID_STATUSES)
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const { status } = await readValidatedBody(event, bodySchema.parse)

  const [updated] = await db.update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Commande introuvable' })
  }

  return updated
})
