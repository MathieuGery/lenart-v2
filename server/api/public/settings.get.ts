import { isCashPaymentEnabled } from '~~/server/utils/settings'

export default defineEventHandler(async () => ({
  cashPaymentEnabled: await isCashPaymentEnabled()
}))