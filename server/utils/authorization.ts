import type { User } from '#auth-utils'
import { defineAbility } from 'nuxt-authorization/runtime/utils'

export const isAdmin = defineAbility((user: User) => {
  return !!user.id
})
