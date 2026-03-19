import { eq } from 'drizzle-orm'
import { settings } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export async function getSetting(key: string, defaultValue: string): Promise<string> {
  const [row] = await db.select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1)
  return row?.value ?? defaultValue
}

export async function getPhotoPriceCents(): Promise<number> {
  return Number(await getSetting('photo_price_cents', '500'))
}
