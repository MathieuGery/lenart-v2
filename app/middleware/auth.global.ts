export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ['/login', '/', '/concours', '/about', '/contact']
  const isPublic = publicRoutes.some(r => to.path === r || to.path.startsWith('/concours/'))

  if (isPublic) return

  const { loggedIn, fetchAdmin, admin } = useAuth()

  if (!admin.value) {
    await fetchAdmin()
  }

  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})
