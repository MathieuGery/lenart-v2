import { createSharedComposable } from '@vueuse/core'

const _useAuth = () => {
  const admin = useState<{ email: string, name: string } | null>('admin', () => null)
  const loggedIn = computed(() => !!admin.value)

  async function fetchAdmin() {
    try {
      admin.value = await $fetch('/api/admin/me')
    } catch {
      admin.value = null
    }
  }

  async function login(email: string, password: string) {
    const result = await $fetch('/api/admin/login', {
      method: 'POST',
      body: { email, password }
    })
    admin.value = result.admin
    return result
  }

  async function logout() {
    await $fetch('/api/admin/logout', { method: 'POST' })
    admin.value = null
    await navigateTo('/login')
  }

  return {
    admin,
    loggedIn,
    fetchAdmin,
    login,
    logout
  }
}

export const useAuth = createSharedComposable(_useAuth)
