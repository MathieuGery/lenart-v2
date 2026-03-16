export default defineEventHandler(async (event) => {
  const { prefix } = getQuery(event)

  return blobList(prefix as string | undefined)
})
