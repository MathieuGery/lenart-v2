export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'admin-session')
  if (token) {
    const sessions = useStorage('sessions')
    await sessions.removeItem(token)
  }

  deleteCookie(event, 'admin-session', { path: '/' })

  return { success: true }
})
