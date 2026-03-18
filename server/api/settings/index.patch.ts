import { z } from 'zod/v4'
import { settings } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

const bodySchema = z.record(z.string(), z.string())

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)

  for (const [key, value] of Object.entries(body)) {
    await db.insert(settings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: new Date() }
      })
  }

  const rows = await db.select().from(settings)
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
})
