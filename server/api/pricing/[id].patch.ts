import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { pricingFormulas, pricingFormulaFeatures } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

const featureSchema = z.object({
  featureText: z.string().min(1),
  displayOrder: z.number().int().default(0)
})

const bodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  basePriceCents: z.number().int().min(0).optional(),
  isFeatured: z.boolean().optional(),
  digitalPhotosCount: z.number().int().min(0).optional(),
  printDetails: z.string().nullable().optional(),
  extraPhotoPriceCents: z.number().int().min(0).nullable().optional(),
  isTourComplete: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  features: z.array(featureSchema).optional()
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, bodySchema.parse)
  const { features, ...formulaData } = body

  const [formula] = await db.update(pricingFormulas)
    .set({ ...formulaData, updatedAt: new Date() })
    .where(eq(pricingFormulas.id, id))
    .returning()

  if (!formula) throw createError({ statusCode: 404, message: 'Formule introuvable' })

  if (features !== undefined) {
    await db.delete(pricingFormulaFeatures).where(eq(pricingFormulaFeatures.formulaId, id))
    if (features.length) {
      await db.insert(pricingFormulaFeatures).values(
        features.map(f => ({ ...f, formulaId: id }))
      )
    }
  }

  return formula
})
