import { desc } from 'drizzle-orm'
import { contactMessages } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async () => {
  return db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt))
})
