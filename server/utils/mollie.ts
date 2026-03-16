import { Client } from 'mollie-api-typescript'

let _mollie: Client | null = null

export function getMollie() {
  if (!_mollie) {
    const apiKey = process.env.MOLLIE_API_KEY
    if (!apiKey) throw new Error('MOLLIE_API_KEY is not set')
    _mollie = new Client({ security: { apiKey } })
  }
  return _mollie
}
