export default defineEventHandler(async () => {
  const { WATERMARK_S3_KEY } = await import('~~/server/utils/watermark')

  const exists = await blobGet(WATERMARK_S3_KEY)
  if (!exists) {
    return { url: null }
  }

  const url = await blobPresignedUrl(WATERMARK_S3_KEY)
  return { url }
})
