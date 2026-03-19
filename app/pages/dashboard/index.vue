<script setup lang="ts">
const { user } = useUserSession()

const { data: stats, status } = await useFetch<DashboardStats>('/api/stats')

const loading = computed(() => status.value === 'pending')

function formatCents(cents: number) {
  return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

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
      <div class="p-6 space-y-8 max-w-6xl">
        <!-- Greeting -->
        <div>
          <h1 class="text-lg font-medium">
            Bonjour, {{ user?.name }} 👋
          </h1>
          <p class="text-sm text-muted mt-0.5">
            Voici un aperçu de l'activité Len-Art.
          </p>
        </div>

        <!-- KPI cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Revenue paid -->
          <div class="border border-default rounded-lg p-4 space-y-1">
            <p class="text-xs text-muted">
              Chiffre d'affaires
            </p>
            <div v-if="loading" class="h-7 w-24 bg-muted/20 rounded animate-pulse" />
            <p v-else class="text-2xl font-light tabular-nums">
              {{ formatCents(stats?.revenue.paidCents ?? 0) }} €
            </p>
            <p class="text-xs text-muted">
              Paiements confirmés
            </p>
          </div>

          <!-- Cash pending -->
          <div class="border border-default rounded-lg p-4 space-y-1">
            <p class="text-xs text-muted">
              Espèces à encaisser
            </p>
            <div v-if="loading" class="h-7 w-24 bg-muted/20 rounded animate-pulse" />
            <p v-else class="text-2xl font-light tabular-nums">
              {{ formatCents(stats?.revenue.cashPendingCents ?? 0) }} €
            </p>
            <p class="text-xs text-muted">
              Commandes cash en attente
            </p>
          </div>

          <!-- Orders -->
          <div class="border border-default rounded-lg p-4 space-y-1">
            <p class="text-xs text-muted">
              Commandes
            </p>
            <div v-if="loading" class="h-7 w-16 bg-muted/20 rounded animate-pulse" />
            <p v-else class="text-2xl font-light tabular-nums">
              {{ stats?.orders.total ?? 0 }}
            </p>
            <p class="text-xs text-muted">
              {{ stats?.orders.paid ?? 0 }} payée{{ (stats?.orders.paid ?? 0) > 1 ? 's' : '' }}
              · {{ stats?.orders.pending ?? 0 }} en attente
            </p>
          </div>

          <!-- Photos -->
          <div class="border border-default rounded-lg p-4 space-y-1">
            <p class="text-xs text-muted">
              Photos
            </p>
            <div v-if="loading" class="h-7 w-16 bg-muted/20 rounded animate-pulse" />
            <p v-else class="text-2xl font-light tabular-nums">
              {{ stats?.photos.total ?? 0 }}
            </p>
            <p class="text-xs text-muted">
              {{ stats?.photos.sold ?? 0 }} vendues · {{ stats?.collections ?? 0 }} concours
            </p>
          </div>
        </div>

        <!-- Alerts row -->
        <div class="flex flex-wrap gap-3">
          <!-- Unread messages -->
          <NuxtLink
            v-if="(stats?.messages.unread ?? 0) > 0"
            to="/dashboard/contact"
            class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-warning/40 bg-warning/5 text-sm hover:bg-warning/10 transition-colors"
          >
            <UIcon name="i-lucide-mail" class="size-4 text-warning" />
            <span>
              <span class="font-medium">{{ stats?.messages.unread }}</span>
              message{{ (stats?.messages.unread ?? 0) > 1 ? 's' : '' }} non lu{{ (stats?.messages.unread ?? 0) > 1 ? 's' : '' }}
            </span>
            <UIcon name="i-lucide-arrow-right" class="size-3 text-muted" />
          </NuxtLink>

          <!-- Cash pending orders -->
          <NuxtLink
            v-if="(stats?.orders.cashPending ?? 0) > 0"
            to="/dashboard/orders"
            class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-warning/40 bg-warning/5 text-sm hover:bg-warning/10 transition-colors"
          >
            <UIcon name="i-lucide-banknote" class="size-4 text-warning" />
            <span>
              <span class="font-medium">{{ stats?.orders.cashPending }}</span>
              commande{{ (stats?.orders.cashPending ?? 0) > 1 ? 's' : '' }} espèces à encaisser
            </span>
            <UIcon name="i-lucide-arrow-right" class="size-3 text-muted" />
          </NuxtLink>
        </div>

        <!-- Main content grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Recent orders -->
          <div class="lg:col-span-2 border border-default rounded-lg overflow-hidden">
            <div class="flex items-center justify-between px-5 py-3 border-b border-default">
              <h2 class="text-sm font-medium">
                Dernières commandes
              </h2>
              <NuxtLink
                to="/dashboard/orders"
                class="text-xs text-muted hover:text-highlighted transition-colors inline-flex items-center gap-1"
              >
                Tout voir
                <UIcon name="i-lucide-arrow-right" class="size-3" />
              </NuxtLink>
            </div>

            <!-- Loading -->
            <div v-if="loading" class="divide-y divide-default">
              <div v-for="i in 5" :key="i" class="px-5 py-3 flex items-center gap-3">
                <div class="h-4 w-24 bg-muted/20 rounded animate-pulse" />
                <div class="h-4 flex-1 bg-muted/20 rounded animate-pulse" />
                <div class="h-5 w-16 bg-muted/20 rounded animate-pulse" />
              </div>
            </div>

            <!-- Orders list -->
            <div v-else-if="stats?.recentOrders.length" class="divide-y divide-default">
              <NuxtLink
                v-for="order in stats.recentOrders"
                :key="order.id"
                :to="`/dashboard/orders/${order.id}`"
                class="flex items-center gap-3 px-5 py-3 hover:bg-elevated/30 transition-colors"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate">
                    {{ order.firstName }} {{ order.lastName }}
                  </p>
                  <p class="text-xs text-muted">
                    {{ formatDate(order.createdAt.toString()) }} · {{ order.photoCount }} photo{{ Number(order.photoCount) > 1 ? 's' : '' }}
                  </p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <UIcon
                    v-if="order.cashPayment"
                    name="i-lucide-banknote"
                    class="size-3.5 text-muted"
                  />
                  <UBadge
                    :color="STATUS_COLOR[order.status] ?? 'neutral'"
                    variant="subtle"
                    size="sm"
                  >
                    {{ STATUS_LABEL[order.status] ?? order.status }}
                  </UBadge>
                  <span class="text-sm font-medium tabular-nums">
                    {{ formatCents(order.totalCents) }} €
                  </span>
                </div>
              </NuxtLink>
            </div>

            <div v-else class="px-5 py-10 text-center">
              <p class="text-sm text-muted">
                Aucune commande pour le moment.
              </p>
            </div>
          </div>

          <!-- Right column -->
          <div class="space-y-4">
            <!-- Order breakdown -->
            <div class="border border-default rounded-lg overflow-hidden">
              <div class="px-5 py-3 border-b border-default">
                <h2 class="text-sm font-medium">
                  Répartition des commandes
                </h2>
              </div>
              <div v-if="loading" class="px-5 py-3 space-y-3">
                <div v-for="i in 4" :key="i" class="h-4 bg-muted/20 rounded animate-pulse" />
              </div>
              <div v-else class="px-5 py-3 space-y-3">
                <div
                  v-for="item in [
                    { label: 'Payées', value: stats?.orders.paid ?? 0, color: 'bg-green-500' },
                    { label: 'En attente', value: (stats?.orders.pending ?? 0) - (stats?.orders.cashPending ?? 0), color: 'bg-yellow-400' },
                    { label: 'Espèces à encaisser', value: stats?.orders.cashPending ?? 0, color: 'bg-orange-400' },
                    { label: 'Annulées / échouées', value: (stats?.orders.cancelled ?? 0) + (stats?.orders.other ?? 0), color: 'bg-muted/40' },
                  ]"
                  :key="item.label"
                  class="flex items-center gap-3"
                >
                  <div class="w-2 h-2 rounded-full shrink-0" :class="item.color" />
                  <span class="text-xs text-muted flex-1">{{ item.label }}</span>
                  <span class="text-xs font-medium tabular-nums">{{ item.value }}</span>
                </div>

                <!-- Bar chart -->
                <div
                  v-if="(stats?.orders.total ?? 0) > 0"
                  class="h-2 rounded-full overflow-hidden flex gap-px mt-1"
                >
                  <div
                    class="bg-green-500 transition-all"
                    :style="{ width: `${((stats?.orders.paid ?? 0) / (stats?.orders.total ?? 1)) * 100}%` }"
                  />
                  <div
                    class="bg-yellow-400 transition-all"
                    :style="{ width: `${(((stats?.orders.pending ?? 0) - (stats?.orders.cashPending ?? 0)) / (stats?.orders.total ?? 1)) * 100}%` }"
                  />
                  <div
                    class="bg-orange-400 transition-all"
                    :style="{ width: `${((stats?.orders.cashPending ?? 0) / (stats?.orders.total ?? 1)) * 100}%` }"
                  />
                </div>
              </div>
            </div>

            <!-- Quick links -->
            <div class="border border-default rounded-lg overflow-hidden">
              <div class="px-5 py-3 border-b border-default">
                <h2 class="text-sm font-medium">
                  Accès rapides
                </h2>
              </div>
              <div class="divide-y divide-default">
                <NuxtLink
                  v-for="link in [
                    { to: '/dashboard/orders', icon: 'i-lucide-receipt', label: 'Commandes', sub: `${stats?.orders.total ?? 0} au total` },
                    { to: '/dashboard/collections', icon: 'i-lucide-images', label: 'Collections', sub: `${stats?.collections ?? 0} concours` },
                    { to: '/dashboard/pricing', icon: 'i-lucide-tag', label: 'Tarifs', sub: 'Formules actives' },
                    { to: '/dashboard/contact', icon: 'i-lucide-mail', label: 'Messages', sub: `${stats?.messages.unread ?? 0} non lu(s)` },
                  ]"
                  :key="link.to"
                  :to="link.to"
                  class="flex items-center gap-3 px-5 py-3 hover:bg-elevated/30 transition-colors"
                >
                  <UIcon :name="link.icon" class="size-4 text-muted shrink-0" />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm">{{ link.label }}</p>
                    <p class="text-xs text-muted">{{ link.sub }}</p>
                  </div>
                  <UIcon name="i-lucide-chevron-right" class="size-4 text-muted/40" />
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
