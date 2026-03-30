import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { orders, orderComments } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

const bodySchema = z.object({
  content: z.string().min(1).max(2000).trim()
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, bodySchema.parse)

  const [order] = await db.select({ id: orders.id }).from(orders).where(eq(orders.id, id)).limit(1)
  if (!order) throw createError({ statusCode: 404, message: 'Commande introuvable' })

  const [comment] = await db.insert(orderComments).values({
    orderId: id,
    content: body.content
  }).returning()

  return comment
})
