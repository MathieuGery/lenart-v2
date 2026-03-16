export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // Skip non-API routes
  if (!path.startsWith('/api/')) return

  // Public API routes
  if (path.startsWith('/api/public/')) return
  if (path === '/api/admin/login') return

  // Auth session routes handled by nuxt-auth-utils
  if (path.startsWith('/api/_auth/')) return

  // All other API routes require authentication
  const session = await getUserSession(event)

  console.log('Admin middleware session:', session)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Non authentifié' })
  }
})
