import { randomUUID } from 'node:crypto'

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)
  if (!form || form.length === 0) {
    throw createError({ statusCode: 400, message: 'No file provided' })
  }

  const file = form.find(f => f.name === 'file')
  if (!file || !file.data || !file.type) {
    throw createError({ statusCode: 400, message: 'Invalid file' })
  }

  const prefix = getQuery(event).prefix as string || ''
  const ext = file.filename?.split('.').pop() || 'jpg'
  const key = `${prefix ? prefix + '/' : ''}${randomUUID()}.${ext}`

  const blob = await blobPut(key, file.data, file.type)

  return blob
})
