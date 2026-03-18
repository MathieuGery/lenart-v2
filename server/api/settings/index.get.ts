import { settings } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async () => {
  const rows = await db.select().from(settings)
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
})
