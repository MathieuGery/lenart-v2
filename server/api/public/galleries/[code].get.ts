import { eq } from 'drizzle-orm'
import { galleries } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')!.toLowerCase()

  const rows = await db
    .select({
      title: galleries.title,
      link: galleries.link,
      date: galleries.date
    })
    .from(galleries)
    .where(eq(galleries.code, code))

  if (!rows.length) {
    throw createError({ statusCode: 404, message: 'Aucune galerie trouvée pour ce code' })
  }

  return rows
})