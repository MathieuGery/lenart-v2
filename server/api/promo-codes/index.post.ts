import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { promoCodes, pricingFormulas } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

const bodySchema = z.object({
  code: z.string().min(1).max(50),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().int().min(1),
  maxUsage: z.number().int().min(1),
  isActive: z.boolean().default(true),
  formulaId: z.string().uuid().nullable().optional()
}).refine(
  data => data.type !== 'percentage' || data.value <= 100,
  { message: 'Le pourcentage doit être entre 1 et 100' }
)

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)

  if (body.formulaId) {
    const [formula] = await db.select({ id: pricingFormulas.id })
      .from(pricingFormulas)
      .where(eq(pricingFormulas.id, body.formulaId))
    if (!formula) {
      throw createError({ statusCode: 400, message: 'Formule introuvable' })
    }
  }

  const [created] = await db.insert(promoCodes).values({
    code: body.code.toUpperCase(),
    type: body.type,
    value: body.value,
    maxUsage: body.maxUsage,
    isActive: body.isActive,
    formulaId: body.formulaId ?? null
  }).returning()

  return created
})
