<script setup lang="ts">
const { user } = useUserSession()
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Dashboard">
        <template #leading>
          <UDashboardSidebarCollapse id="default" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6">
        <div class="max-w-2xl">
          <h1 class="text-xl font-medium">
            Bienvenue, {{ user?.name }}
          </h1>
          <p class="mt-2 text-sm text-muted">
            Espace d'administration Len-Art.
          </p>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
