import { z } from 'zod'
import { galleries } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

const bodySchema = z.object({
  title: z.string().min(1).max(255),
  code: z.string().min(1).max(100),
  link: z.string().url().max(1000),
  date: z.string().max(20).nullable().optional()
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)

  const [created] = await db.insert(galleries).values({
    title: body.title,
    code: body.code.toLowerCase(),
    link: body.link,
    date: body.date ?? null
  }).returning()

  return created
})