export default defineEventHandler(async () => {
  const { WATERMARK_S3_KEY } = await import('~~/server/utils/watermark')

  await blobDelete(WATERMARK_S3_KEY)
  return { success: true }
})
