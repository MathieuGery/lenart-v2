import { eq } from 'drizzle-orm'
import { pricingFormulas } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await db.delete(pricingFormulas).where(eq(pricingFormulas.id, id))
  return { deleted: id }
})
