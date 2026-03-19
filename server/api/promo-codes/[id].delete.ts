import { eq } from 'drizzle-orm'
import { promoCodes } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await db.delete(promoCodes).where(eq(promoCodes.id, id))
  return { success: true }
})
