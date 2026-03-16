import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
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

  const token = randomUUID()

  setCookie(event, 'admin-session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/'
  })

  // Store session in memory (replace with DB/Redis in production)
  const sessions = useStorage('sessions')
  await sessions.setItem(token, { adminId: admin.id, email: admin.email, name: admin.name })

  return { admin: { email: admin.email, name: admin.name } }
})
