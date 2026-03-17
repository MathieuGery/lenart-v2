import { asc, eq } from 'drizzle-orm'
import { pricingFormulas, pricingFormulaFeatures } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async () => {
  const formulas = await db.select()
    .from(pricingFormulas)
    .where(eq(pricingFormulas.isActive, true))
    .orderBy(asc(pricingFormulas.displayOrder))

  const features = await db.select()
    .from(pricingFormulaFeatures)
    .orderBy(asc(pricingFormulaFeatures.displayOrder))

  return formulas.map(f => ({
    ...f,
    features: features.filter(feat => feat.formulaId === f.id)
  }))
})
