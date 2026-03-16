<script setup lang="ts">
useDashboard()

const { admin } = useAuth()
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Dashboard" />
    </template>

    <div class="p-6">
      <div class="max-w-2xl">
        <h1 class="text-xl font-medium">
          Bienvenue, {{ admin?.name }}
        </h1>
        <p class="mt-2 text-sm text-muted">
          Espace d'administration Len-Art.
        </p>
      </div>
    </div>
  </UDashboardPanel>
</template>
