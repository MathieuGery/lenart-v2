import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { promoCodes } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

const bodySchema = z.object({
  code: z.string().min(1).max(50),
  formulaId: z.string().uuid().optional()
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)

  const [promo] = await db.select()
    .from(promoCodes)
    .where(eq(promoCodes.code, body.code.toUpperCase()))
    .limit(1)

  if (!promo) {
    return { valid: false, message: 'Code promo introuvable' }
  }

  if (!promo.isActive) {
    return { valid: false, message: 'Ce code promo n\'est plus actif' }
  }

  if (promo.usageCount >= promo.maxUsage) {
    return { valid: false, message: 'Ce code promo a atteint son nombre maximal d\'utilisations' }
  }

  if (promo.formulaId && body.formulaId && promo.formulaId !== body.formulaId) {
    return { valid: false, message: 'Ce code promo n\'est pas valable pour cette formule' }
  }

  if (promo.formulaId && !body.formulaId) {
    return { valid: false, message: 'Ce code promo est réservé à une formule spécifique' }
  }

  return {
    valid: true,
    code: promo.code,
    type: promo.type,
    value: promo.value
  }
})
