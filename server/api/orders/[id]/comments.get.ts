import { eq, asc } from 'drizzle-orm'
import { orders, orderComments } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const [order] = await db.select({ id: orders.id }).from(orders).where(eq(orders.id, id)).limit(1)
  if (!order) throw createError({ statusCode: 404, message: 'Commande introuvable' })

  return db.select().from(orderComments)
    .where(eq(orderComments.orderId, id))
    .orderBy(asc(orderComments.createdAt))
})
