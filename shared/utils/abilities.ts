import { defineAbility } from 'nuxt-authorization/runtime/utils'

export const canAccessAdmin = defineAbility(() => true)
export const canManageCollections = defineAbility(() => true)
export const canManagePhotos = defineAbility(() => true)
export const canManageBlob = defineAbility(() => true)
