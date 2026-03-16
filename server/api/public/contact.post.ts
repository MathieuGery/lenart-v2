import { z } from 'zod'
import { contactMessages } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

const bodySchema = z.object({
  name: z.string().min(1).max(255),
  email: z.email(),
  subject: z.string().min(1).max(255),
  message: z.string().min(1).max(5000)
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)

  const [msg] = await db.insert(contactMessages).values(body).returning()

  return { id: msg.id }
})
