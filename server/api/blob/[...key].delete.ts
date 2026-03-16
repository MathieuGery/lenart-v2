export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key')
  if (!key) {
    throw createError({ statusCode: 400, message: 'Missing key' })
  }

  await blobDelete(key)

  return { deleted: key }
})
