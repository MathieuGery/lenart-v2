import { eq } from 'drizzle-orm'
import { galleries } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await db.delete(galleries).where(eq(galleries.id, id))
  return { success: true }
})