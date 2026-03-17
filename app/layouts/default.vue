<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const open = ref(false)

const links = [[{
  label: 'Dashboard',
  icon: 'i-lucide-house',
  to: '/dashboard',
  exact: true,
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Collections',
  icon: 'i-lucide-image',
  to: '/dashboard/collections',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Commandes',
  icon: 'i-lucide-shopping-bag',
  to: '/dashboard/orders',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Messages',
  icon: 'i-lucide-inbox',
  to: '/dashboard/contact',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Tarifs',
  icon: 'i-lucide-tag',
  to: '/dashboard/pricing',
  onSelect: () => {
    open.value = false
  }
}]] satisfies NavigationMenuItem[][]
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          to="/dashboard"
          class="flex items-center gap-2 px-1 py-1.5 font-medium text-sm"
        >
          <span v-if="!collapsed">Len-Art</span>
          <span v-else>L</span>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
