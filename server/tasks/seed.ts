import { eq } from 'drizzle-orm'
import { admins } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineTask({
  meta: {
    name: 'seed',
    description: 'Create the default admin account'
  },
  async run() {
    const email = 'admin@lenart.fr'

    const existing = await db.select()
      .from(admins)
      .where(eq(admins.email, email))
      .limit(1)

    if (existing.length > 0) {
      return { result: `Admin ${email} already exists` }
    }

    await db.insert(admins).values({
      email,
      password: await hashPassword('admin123'),
      name: 'Admin'
    })

    return { result: `Admin ${email} created` }
  }
})
