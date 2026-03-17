import { z } from 'zod'
import { pricingFormulas, pricingFormulaFeatures } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

const featureSchema = z.object({
  featureText: z.string().min(1),
  displayOrder: z.number().int().default(0)
})

const bodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  basePriceCents: z.number().int().min(0).default(0),
  isFeatured: z.boolean().default(false),
  digitalPhotosCount: z.number().int().min(0).default(0),
  printDetails: z.string().optional(),
  extraPhotoPriceCents: z.number().int().min(0).optional(),
  isTourComplete: z.boolean().default(false),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
  features: z.array(featureSchema).default([])
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)
  const { features, ...formulaData } = body

  const [formula] = await db.insert(pricingFormulas).values(formulaData).returning()

  if (features.length) {
    await db.insert(pricingFormulaFeatures).values(
      features.map(f => ({ ...f, formulaId: formula.id }))
    )
  }

  return formula
})
