import { and, eq } from 'drizzle-orm'
import { orderComments } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const orderId = getRouterParam(event, 'id')!
  const commentId = getRouterParam(event, 'commentId')!

  const deleted = await db.delete(orderComments)
    .where(and(eq(orderComments.id, commentId), eq(orderComments.orderId, orderId)))
    .returning()

  if (!deleted.length) throw createError({ statusCode: 404, message: 'Commentaire introuvable' })

  return { ok: true }
})
