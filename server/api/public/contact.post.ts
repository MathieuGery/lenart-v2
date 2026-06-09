import { z } from 'zod'
import { contactMessages } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { getSetting } from '~~/server/utils/settings'
import { sendContactNotificationEmail } from '~~/server/utils/email'

const bodySchema = z.object({
  name: z.string().min(1).max(255),
  email: z.email(),
  subject: z.string().min(1).max(255),
  message: z.string().min(1).max(5000)
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)

  const [msg] = await db.insert(contactMessages).values(body).returning()

  const notificationEmail = await getSetting('contact_notification_email', '')
  if (notificationEmail) {
    await sendContactNotificationEmail({
      to: notificationEmail,
      name: body.name,
      email: body.email,
      subject: body.subject,
      message: body.message
    })
  }

  return { id: msg.id }
})
