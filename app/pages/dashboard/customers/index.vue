<script setup lang="ts">
const search = ref('')
const searchDebounced = ref('')
let timeout: ReturnType<typeof setTimeout> | null = null

watch(search, (val) => {
  if (timeout) clearTimeout(timeout)
  timeout = setTimeout(() => { searchDebounced.value = val }, 300)
})

const { data: customers, status } = useFetch<CustomerListItem[]>('/api/customers', {
  query: { search: searchDebounced }
})

const loading = computed(() => status.value === 'pending')

type SortKey = 'name' | 'orderCount' | 'totalSpentCents' | 'lastOrderAt' | 'firstOrderAt'
const sortBy = ref<SortKey>('lastOrderAt')
const sortDir = ref<'asc' | 'desc'>('desc')

function toggleSort(key: SortKey) {
  if (sortBy.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = key
    sortDir.value = 'desc'
  }
}

const sortedCustomers = computed(() => {
  if (!customers.value) return []
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...customers.value].sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return dir * `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      case 'orderCount':
        return dir * (a.paidOrderCount - b.paidOrderCount)
      case 'totalSpentCents':
        return dir * (a.totalSpentCents - b.totalSpentCents)
      case 'lastOrderAt':
        return dir * (new Date(a.lastOrderAt).getTime() - new Date(b.lastOrderAt).getTime())
      case 'firstOrderAt':
        return dir * (new Date(a.firstOrderAt).getTime() - new Date(b.firstOrderAt).getTime())
      default:
        return 0
    }
  })
})

function sortIcon(key: SortKey) {
  if (sortBy.value !== key) return 'i-lucide-arrow-up-down'
  return sortDir.value === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'
}

function formatCents(cents: number) {
  return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function relativeDate(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  if (days < 30) return `Il y a ${days} jours`
  const months = Math.floor(days / 30)
  if (months < 12) return `Il y a ${months} mois`
  return `Il y a ${Math.floor(months / 12)} an${Math.floor(months / 12) > 1 ? 's' : ''}`
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Clients">
        <template #leading>
          <UDashboardSidebarCollapse id="default" />
        </template>

      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 max-w-6xl space-y-6">
        <!-- Stats row -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="border border-default rounded-lg p-4 space-y-1">
            <p class="text-xs text-muted">Clients</p>
            <p class="text-2xl font-light tabular-nums">{{ customers?.length ?? 0 }}</p>
            <p class="text-xs text-muted">Clients uniques</p>
          </div>
          <div class="border border-default rounded-lg p-4 space-y-1">
            <p class="text-xs text-muted">Commandes totales</p>
            <p class="text-2xl font-light tabular-nums">{{ customers?.reduce((s, c) => s + c.orderCount, 0) ?? 0 }}</p>
            <p class="text-xs text-muted">Toutes commandes</p>
          </div>
          <div class="border border-default rounded-lg p-4 space-y-1">
            <p class="text-xs text-muted">Panier moyen</p>
            <p class="text-2xl font-light tabular-nums">
              {{
                customers?.length
                  ? formatCents(Math.round(customers.reduce((s, c) => s + c.totalSpentCents, 0) / (customers.reduce((s, c) => s + c.paidOrderCount, 0) || 1)))
                  : '0,00'
              }} €
            </p>
            <p class="text-xs text-muted">Par commande payée</p>
          </div>
          <div class="border border-default rounded-lg p-4 space-y-1">
            <p class="text-xs text-muted">Clients fidèles</p>
            <p class="text-2xl font-light tabular-nums">{{ customers?.filter(c => c.paidOrderCount > 1).length ?? 0 }}</p>
            <p class="text-xs text-muted">Plus d'une commande payée</p>
          </div>
        </div>

        <!-- Customer table -->
        <div class="border border-default rounded-lg overflow-hidden">
          <div class="flex items-center justify-between px-5 py-3 border-b border-default">
            <h2 class="text-sm font-medium">Liste des clients</h2>
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Rechercher un client..."
              class="w-64"
            />
          </div>

          <!-- Loading -->
          <div v-if="loading" class="divide-y divide-default">
            <div v-for="i in 8" :key="i" class="px-5 py-3 flex items-center gap-4">
              <div class="h-4 w-32 bg-muted/20 rounded animate-pulse" />
              <div class="h-4 flex-1 bg-muted/20 rounded animate-pulse" />
              <div class="h-4 w-20 bg-muted/20 rounded animate-pulse" />
            </div>
          </div>

          <!-- Table header -->
          <div v-else-if="customers?.length" class="divide-y divide-default">
            <div class="grid grid-cols-12 gap-4 px-5 py-2 text-xs text-muted font-medium uppercase tracking-wider bg-elevated/30">
              <button class="col-span-4 flex items-center gap-1 hover:text-highlighted transition-colors" @click="toggleSort('name')">
                Client
                <UIcon :name="sortIcon('name')" class="size-3" />
              </button>
              <button class="col-span-2 flex items-center gap-1 hover:text-highlighted transition-colors" @click="toggleSort('orderCount')">
                Commandes
                <UIcon :name="sortIcon('orderCount')" class="size-3" />
              </button>
              <button class="col-span-2 flex items-center gap-1 justify-end hover:text-highlighted transition-colors" @click="toggleSort('totalSpentCents')">
                Total dépensé
                <UIcon :name="sortIcon('totalSpentCents')" class="size-3" />
              </button>
              <button class="col-span-2 flex items-center gap-1 hover:text-highlighted transition-colors" @click="toggleSort('lastOrderAt')">
                Dernière commande
                <UIcon :name="sortIcon('lastOrderAt')" class="size-3" />
              </button>
              <button class="col-span-2 flex items-center gap-1 hover:text-highlighted transition-colors" @click="toggleSort('firstOrderAt')">
                Première commande
                <UIcon :name="sortIcon('firstOrderAt')" class="size-3" />
              </button>
            </div>

            <NuxtLink
              v-for="customer in sortedCustomers"
              :key="customer.email"
              :to="`/dashboard/customers/${encodeURIComponent(customer.email)}`"
              class="grid grid-cols-12 gap-4 px-5 py-3 hover:bg-elevated/30 transition-colors items-center"
            >
              <div class="col-span-4 min-w-0">
                <p class="text-sm font-medium truncate">{{ customer.firstName }} {{ customer.lastName }}</p>
                <p class="text-xs text-muted truncate">{{ customer.email }}</p>
              </div>
              <div class="col-span-2">
                <span class="text-sm tabular-nums">{{ customer.paidOrderCount }}</span>
                <span class="text-xs text-muted"> payée{{ customer.paidOrderCount > 1 ? 's' : '' }}</span>
                <span v-if="customer.orderCount - customer.paidOrderCount > 0" class="text-xs text-muted"> · {{ customer.orderCount - customer.paidOrderCount }} autre{{ customer.orderCount - customer.paidOrderCount > 1 ? 's' : '' }}</span>
              </div>
              <div class="col-span-2 text-right">
                <span class="text-sm font-medium tabular-nums">{{ formatCents(customer.totalSpentCents) }} €</span>
              </div>
              <div class="col-span-2">
                <p class="text-sm">{{ relativeDate(customer.lastOrderAt) }}</p>
                <p class="text-xs text-muted">{{ formatDate(customer.lastOrderAt) }}</p>
              </div>
              <div class="col-span-2">
                <p class="text-xs text-muted">{{ formatDate(customer.firstOrderAt) }}</p>
              </div>
            </NuxtLink>
          </div>

          <!-- Empty state -->
          <div v-else class="px-5 py-16 text-center">
            <UIcon name="i-lucide-users" class="size-8 text-muted/40 mx-auto mb-3" />
            <p class="text-sm text-muted">
              {{ search ? 'Aucun client trouvé pour cette recherche.' : 'Aucun client pour le moment.' }}
            </p>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
