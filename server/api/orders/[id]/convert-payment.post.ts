import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { orders } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

const bodySchema = z.object({
  paymentMethod: z.enum(['link', 'terminal']),
  terminalId: z.string().optional()
}).refine(d => d.paymentMethod !== 'terminal' || !!d.terminalId, {
  message: 'terminalId requis pour le paiement par terminal',
  path: ['terminalId']
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, bodySchema.parse)

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
  if (!order) throw createError({ statusCode: 404, message: 'Commande introuvable' })

  const isCashConversion = order.cashPayment && order.status === 'pending'
  const isFailedRetry = !order.cashPayment && order.status === 'failed'
  if (!isCashConversion && !isFailedRetry) {
    throw createError({ statusCode: 400, message: 'Cette commande ne peut pas être relancée' })
  }

  const appUrl = process.env.NUXT_APP_URL ?? 'https://v2.len-art.fr'
  const mollie = getMollie()
  const description = `Commande Len-Art #${order.id.slice(0, 8).toUpperCase()}`
  const euros = (order.totalCents / 100).toFixed(2)

  let payment
  if (body.paymentMethod === 'terminal') {
    payment = await mollie.payments.create({
      paymentRequest: {
        description,
        amount: { currency: 'EUR', value: euros },
        redirectUrl: null,
        method: 'pointofsale',
        terminalId: body.terminalId,
        webhookUrl: `${appUrl}/api/public/webhooks/mollie`,
        metadata: { orderId: order.id }
      }
    })
  } else {
    payment = await mollie.payments.create({
      paymentRequest: {
        description,
        amount: { currency: 'EUR', value: euros },
        redirectUrl: `${appUrl}/commande/succes?orderId=${order.id}`,
        cancelUrl: `${appUrl}/commande/annule?orderId=${order.id}`,
        webhookUrl: `${appUrl}/api/public/webhooks/mollie`,
        locale: 'fr_FR',
        metadata: { orderId: order.id }
      }
    })
  }

  await db.update(orders).set({
    cashPayment: false,
    molliePaymentId: payment.id,
    status: 'pending',
    updatedAt: new Date()
  }).where(eq(orders.id, id))

  return {
    checkoutUrl: payment.links?.checkout?.href ?? null
  }
})
