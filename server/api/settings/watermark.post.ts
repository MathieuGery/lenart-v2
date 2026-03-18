export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)
  if (!form || form.length === 0) {
    throw createError({ statusCode: 400, message: 'Aucun fichier' })
  }

  const file = form.find(f => f.name === 'file' && f.data && f.type)
  if (!file) {
    throw createError({ statusCode: 400, message: 'Aucun fichier valide' })
  }

  if (!file.type?.startsWith('image/')) {
    throw createError({ statusCode: 400, message: 'Le fichier doit être une image' })
  }

  const { WATERMARK_S3_KEY } = await import('~~/server/utils/watermark')

  await blobPut(WATERMARK_S3_KEY, file.data, file.type)

  const url = await blobPresignedUrl(WATERMARK_S3_KEY)
  return { url }
})
