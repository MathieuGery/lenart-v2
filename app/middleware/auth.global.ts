export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ['/login', '/', '/concours', '/about', '/contact']
  const isPublic = publicRoutes.some(r => to.path === r || to.path.startsWith('/concours/'))

  if (isPublic) return

  const { loggedIn, fetch: fetchSession } = useUserSession()

  if (!loggedIn.value) {
    await fetchSession()
  }

  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})
