import { desc, eq } from 'drizzle-orm'
import { promoCodes, pricingFormulas } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async () => {
  const rows = await db
    .select({
      id: promoCodes.id,
      code: promoCodes.code,
      type: promoCodes.type,
      value: promoCodes.value,
      maxUsage: promoCodes.maxUsage,
      usageCount: promoCodes.usageCount,
      isActive: promoCodes.isActive,
      formulaId: promoCodes.formulaId,
      formulaName: pricingFormulas.name,
      createdAt: promoCodes.createdAt,
      updatedAt: promoCodes.updatedAt
    })
    .from(promoCodes)
    .leftJoin(pricingFormulas, eq(promoCodes.formulaId, pricingFormulas.id))
    .orderBy(desc(promoCodes.createdAt))

  return rows
})
