import { eq } from 'drizzle-orm'
import { admins } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.email || !body.password) {
    throw createError({ statusCode: 400, statusMessage: 'Email et mot de passe requis' })
  }

  const [admin] = await db.select()
    .from(admins)
    .where(eq(admins.email, body.email))
    .limit(1)

  if (!admin || !await verifyPassword(body.password, admin.password)) {
    throw createError({ statusCode: 401, statusMessage: 'Identifiants incorrects' })
  }

  await setUserSession(event, {
    user: {
      id: admin.id,
      email: admin.email,
      name: admin.name
    }
  })

  return { admin: { email: admin.email, name: admin.name } }
})
