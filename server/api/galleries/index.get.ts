import { desc } from 'drizzle-orm'
import { galleries } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async () => {
  return await db
    .select()
    .from(galleries)
    .orderBy(desc(galleries.createdAt))
})