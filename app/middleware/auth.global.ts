export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ['/login', '/', '/concours', '/about', '/contact', '/galeries', '/commande']
  const publicPrefixes = ['/concours/', '/galeries/', '/commande/']
  const isPublic = publicRoutes.includes(to.path) || publicPrefixes.some(prefix => to.path.startsWith(prefix))

  if (isPublic) return

  const { loggedIn, fetch: fetchSession } = useUserSession()

  if (!loggedIn.value) {
    await fetchSession()
  }

  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})
