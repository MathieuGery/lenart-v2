export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'admin-session')
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Non authentifié' })
  }

  const sessions = useStorage('sessions')
  const session = await sessions.getItem(token)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Session invalide' })
  }

  return session
})
