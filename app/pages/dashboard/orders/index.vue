<script setup lang="ts">
const { data: orders, refresh } = await useFetch('/api/orders')

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  paid: 'Payée',
  cancelled: 'Annulée',
  expired: 'Expirée',
  failed: 'Échouée'
}

const STATUS_COLOR: Record<string, 'warning' | 'success' | 'error' | 'neutral'> = {
  pending: 'warning',
  paid: 'success',
  cancelled: 'neutral',
  expired: 'neutral',
  failed: 'error'
}

// Search
const search = ref('')

// Sort
type SortKey = 'createdAt' | 'firstName' | 'totalCents' | 'photoCount' | 'status'
const sortKey = ref<SortKey>('createdAt')
const sortDir = ref<'asc' | 'desc'>('desc')

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = key === 'createdAt' ? 'desc' : 'asc'
  }
}

const filteredOrders = computed(() => {
  if (!orders.value) return []

  let rows = [...orders.value]

  // Filter
  const q = search.value.trim().toLowerCase()
  if (q) {
    rows = rows.filter(o =>
      o.firstName.toLowerCase().includes(q)
      || o.lastName.toLowerCase().includes(q)
      || o.email.toLowerCase().includes(q)
      || o.id.toLowerCase().includes(q)
      || (STATUS_LABEL[o.status] ?? '').toLowerCase().includes(q)
    )
  }

  // Sort
  rows.sort((a, b) => {
    let valA: string | number
    let valB: string | number

    if (sortKey.value === 'firstName') {
      valA = `${a.firstName} ${a.lastName}`.toLowerCase()
      valB = `${b.firstName} ${b.lastName}`.toLowerCase()
    } else if (sortKey.value === 'createdAt') {
      valA = new Date(a.createdAt).getTime()
      valB = new Date(b.createdAt).getTime()
    } else if (sortKey.value === 'status') {
      valA = a.status
      valB = b.status
    } else {
      valA = a[sortKey.value] as number
      valB = b[sortKey.value] as number
    }

    if (valA < valB) return sortDir.value === 'asc' ? -1 : 1
    if (valA > valB) return sortDir.value === 'asc' ? 1 : -1
    return 0
  })

  return rows
})
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Commandes">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            size="sm"
            square
            @click="refresh()"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="!orders?.length" class="flex flex-col items-center justify-center py-24 text-center">
        <UIcon name="i-lucide-shopping-bag" class="size-10 text-muted mb-4" />
        <p class="text-sm text-muted">
          Aucune commande pour le moment.
        </p>
      </div>

      <div v-else class="p-6 space-y-4">
        <!-- Search bar -->
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Rechercher par nom, e-mail, statut…"
          size="sm"
          color="neutral"
          class="w-full sm:max-w-sm"
          :trailing="search ? true : false"
        >
          <template v-if="search" #trailing>
            <button type="button" class="text-muted hover:text-highlighted" @click="search = ''">
              <UIcon name="i-lucide-x" class="size-3.5" />
            </button>
          </template>
        </UInput>

        <div class="border border-default rounded-lg overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-default bg-elevated/30">
                <th class="text-left px-4 py-3 font-medium text-xs text-muted">
                  Commande
                </th>
                <!-- Sortable: Client -->
                <th class="text-left px-4 py-3 font-medium text-xs">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 text-muted hover:text-highlighted transition-colors"
                    @click="toggleSort('firstName')"
                  >
                    Client
                    <UIcon
                      :name="sortKey === 'firstName' ? (sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down') : 'i-lucide-arrow-up-down'"
                      class="size-3"
                      :class="sortKey === 'firstName' ? 'text-highlighted' : 'opacity-40'"
                    />
                  </button>
                </th>
                <!-- Sortable: Photos -->
                <th class="text-left px-4 py-3 font-medium text-xs hidden sm:table-cell">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 text-muted hover:text-highlighted transition-colors"
                    @click="toggleSort('photoCount')"
                  >
                    Photos
                    <UIcon
                      :name="sortKey === 'photoCount' ? (sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down') : 'i-lucide-arrow-up-down'"
                      class="size-3"
                      :class="sortKey === 'photoCount' ? 'text-highlighted' : 'opacity-40'"
                    />
                  </button>
                </th>
                <!-- Sortable: Total -->
                <th class="text-left px-4 py-3 font-medium text-xs hidden md:table-cell">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 text-muted hover:text-highlighted transition-colors"
                    @click="toggleSort('totalCents')"
                  >
                    Total
                    <UIcon
                      :name="sortKey === 'totalCents' ? (sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down') : 'i-lucide-arrow-up-down'"
                      class="size-3"
                      :class="sortKey === 'totalCents' ? 'text-highlighted' : 'opacity-40'"
                    />
                  </button>
                </th>
                <!-- Sortable: Statut -->
                <th class="text-left px-4 py-3 font-medium text-xs">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 text-muted hover:text-highlighted transition-colors"
                    @click="toggleSort('status')"
                  >
                    Statut
                    <UIcon
                      :name="sortKey === 'status' ? (sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down') : 'i-lucide-arrow-up-down'"
                      class="size-3"
                      :class="sortKey === 'status' ? 'text-highlighted' : 'opacity-40'"
                    />
                  </button>
                </th>
                <!-- Sortable: Date -->
                <th class="text-left px-4 py-3 font-medium text-xs hidden lg:table-cell">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 text-muted hover:text-highlighted transition-colors"
                    @click="toggleSort('createdAt')"
                  >
                    Date
                    <UIcon
                      :name="sortKey === 'createdAt' ? (sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down') : 'i-lucide-arrow-up-down'"
                      class="size-3"
                      :class="sortKey === 'createdAt' ? 'text-highlighted' : 'opacity-40'"
                    />
                  </button>
                </th>
                <th class="w-10" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="order in filteredOrders"
                :key="order.id"
                class="border-b border-default last:border-0 hover:bg-elevated/30 transition-colors"
              >
                <td class="px-4 py-3">
                  <span class="font-mono text-xs text-muted">
                    #{{ order.id.slice(0, 8).toUpperCase() }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <p class="font-medium">
                    {{ order.firstName }} {{ order.lastName }}
                  </p>
                  <p class="text-xs text-muted">
                    {{ order.email }}
                  </p>
                </td>
                <td class="px-4 py-3 hidden sm:table-cell text-muted">
                  {{ order.photoCount }}
                </td>
                <td class="px-4 py-3 hidden md:table-cell font-medium">
                  {{ (order.totalCents / 100).toFixed(2) }} €
                </td>
                <td class="px-4 py-3">
                  <UBadge
                    :color="STATUS_COLOR[order.status] ?? 'neutral'"
                    variant="subtle"
                    size="sm"
                  >
                    {{ STATUS_LABEL[order.status] ?? order.status }}
                  </UBadge>
                </td>
                <td class="px-4 py-3 hidden lg:table-cell text-xs text-muted">
                  {{ new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) }}
                </td>
                <td class="px-4 py-3">
                  <UButton
                    :to="`/dashboard/orders/${order.id}`"
                    icon="i-lucide-chevron-right"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    square
                  />
                </td>
              </tr>

              <!-- Empty search result -->
              <tr v-if="!filteredOrders.length">
                <td colspan="7" class="px-4 py-10 text-center text-sm text-muted">
                  Aucune commande ne correspond à « {{ search }} ».
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="text-xs text-muted">
          {{ filteredOrders.length }} commande{{ filteredOrders.length !== 1 ? 's' : '' }}
          <template v-if="search">
            sur {{ orders?.length }}
          </template>
        </p>
      </div>
    </template>
  </UDashboardPanel>
</template>
