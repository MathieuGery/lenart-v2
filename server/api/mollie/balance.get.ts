interface MollieAmount {
  currency: string
  value: string
}

interface MollieBalance {
  resource: string
  id: string
  mode: string
  createdAt: string
  currency: string
  description: string
  status: string
  availableAmount: MollieAmount
  pendingAmount: MollieAmount
  transferFrequency: string | null
  transferThreshold: MollieAmount | null
  transferReference: string | null
  transferDestination: {
    type?: string
    bankAccount?: string
    beneficiaryName?: string
  } | null
}

export default defineEventHandler(async () => {
  const accessToken = process.env.MOLLIE_ACCESS_TOKEN
  if (!accessToken) {
    throw createError({ statusCode: 500, message: 'MOLLIE_ACCESS_TOKEN non configuré' })
  }

  const balance = await $fetch<MollieBalance>('https://api.mollie.com/v2/balances/primary', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  return balance
})
