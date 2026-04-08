<script setup lang="ts">
const { user } = useUserSession()

const now = new Date()
const selectedMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

const { data: stats, status, refresh } = await useFetch<DashboardStats>('/api/stats', {
  query: { month: selectedMonth }
})

const monthLabel = computed(() => {
  const [year, month] = selectedMonth.value.split('-').map(Number)
  const date = new Date(year, month - 1)
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
})

function changeMonth(delta: number) {
  const [year, month] = selectedMonth.value.split('-').map(Number)
  const d = new Date(year, month - 1 + delta)
  selectedMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const isCurrentMonth = computed(() => {
  return selectedMonth.value === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
})

interface MollieAmount {
  currency: string
  value: string
}

interface MollieBalance {
  id: string
  mode: string
  status: string
  currency: string
  description: string
  availableAmount: MollieAmount
  pendingAmount: MollieAmount
  transferFrequency: string | null
  transferThreshold: MollieAmount | null
  transferReference: string | null
  transferDestination: { type?: string, bankAccount?: string, beneficiaryName?: string } | null
}

const { data: mollieBalance, status: mollieStatus } = useFetch<MollieBalance>('/api/mollie/balance')
const mollieLoading = computed(() => mollieStatus.value === 'pending')

const TRANSFER_FREQ_LABEL: Record<string, string> = {
  'every-day': 'Chaque jour',
  daily: 'Quotidien',
  'every-monday': 'Chaque lundi',
  'every-tuesday': 'Chaque mardi',
  'every-wednesday': 'Chaque mercredi',
  'every-thursday': 'Chaque jeudi',
  'every-friday': 'Chaque vendredi',
  monthly: 'Mensuel',
  'revenue-day': 'Jour de revenu',
  never: 'Jamais'
}

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
        <template #right>
          <div class="flex items-center gap-1">
            <UButton
              icon="i-lucide-chevron-left"
              variant="ghost"
              size="xs"
              @click="changeMonth(-1)"
            />
            <span class="text-sm font-medium capitalize min-w-35 text-center">
              {{ monthLabel }}
            </span>
            <UButton
              icon="i-lucide-chevron-right"
              variant="ghost"
              size="xs"
              :disabled="isCurrentMonth"
              @click="changeMonth(1)"
            />
          </div>
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

        <!-- Mollie balance -->
        <div class="border border-default rounded-lg overflow-hidden">
          <div class="flex items-center justify-between px-5 py-3 border-b border-default">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-landmark" class="size-4 text-muted" />
              <h2 class="text-sm font-medium">Solde Mollie</h2>
            </div>
            <div v-if="mollieBalance" class="flex items-center gap-1.5">
              <div class="size-1.5 rounded-full" :class="mollieBalance.status === 'active' ? 'bg-green-500' : 'bg-muted'" />
              <span class="text-[10px] font-mono uppercase" :class="mollieBalance.mode === 'test' ? 'text-amber-500' : 'text-muted'">
                {{ mollieBalance.mode }}
              </span>
            </div>
          </div>

          <div v-if="mollieLoading" class="px-5 py-4 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div v-for="i in 4" :key="i" class="space-y-2">
              <div class="h-3 w-16 bg-muted/20 rounded animate-pulse" />
              <div class="h-7 w-24 bg-muted/20 rounded animate-pulse" />
            </div>
          </div>

          <div v-else-if="mollieBalance" class="px-5 py-4 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <!-- Total -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-muted mb-0.5">Total Mollie</p>
              <p class="text-2xl font-semibold tabular-nums">
                {{ (Number(mollieBalance.availableAmount.value) + Number(mollieBalance.pendingAmount.value)).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                <span class="text-sm font-normal text-muted">{{ mollieBalance.availableAmount.currency }}</span>
              </p>
              <p class="text-xs text-muted mt-0.5">Disponible + en attente</p>
            </div>

            <!-- Disponible -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-muted mb-0.5">Disponible</p>
              <p class="text-2xl font-light tabular-nums">
                {{ Number(mollieBalance.availableAmount.value).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                <span class="text-sm text-muted">{{ mollieBalance.availableAmount.currency }}</span>
              </p>
              <p class="text-xs text-muted mt-0.5">Prêt à être viré</p>
            </div>

            <!-- En attente -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-muted mb-0.5">En attente</p>
              <p class="text-2xl font-light tabular-nums">
                {{ Number(mollieBalance.pendingAmount.value).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                <span class="text-sm text-muted">{{ mollieBalance.pendingAmount.currency }}</span>
              </p>
              <p class="text-xs text-muted mt-0.5">Pas encore disponible</p>
            </div>

            <!-- Virement -->
            <div class="space-y-1.5 text-xs">
              <p class="text-[10px] uppercase tracking-wider text-muted mb-0.5">Virement</p>
              <div v-if="mollieBalance.transferFrequency" class="flex items-center justify-between gap-2">
                <span class="text-muted">Fréquence</span>
                <span class="font-medium">{{ TRANSFER_FREQ_LABEL[mollieBalance.transferFrequency] ?? mollieBalance.transferFrequency }}</span>
              </div>
              <div v-if="mollieBalance.transferThreshold" class="flex items-center justify-between gap-2">
                <span class="text-muted">Seuil</span>
                <span class="font-medium">
                  {{ Number(mollieBalance.transferThreshold.value).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) }} {{ mollieBalance.transferThreshold.currency }}
                </span>
              </div>
              <div v-if="mollieBalance.transferDestination?.beneficiaryName" class="flex items-center justify-between gap-2">
                <span class="text-muted shrink-0">Bénéficiaire</span>
                <span class="font-medium truncate text-right">{{ mollieBalance.transferDestination.beneficiaryName }}</span>
              </div>
              <div v-if="mollieBalance.transferDestination?.bankAccount" class="flex items-center justify-between gap-2">
                <span class="text-muted shrink-0">IBAN</span>
                <span class="font-mono truncate text-right">{{ mollieBalance.transferDestination.bankAccount }}</span>
              </div>
            </div>
          </div>

          <div v-else class="px-5 py-4 text-xs text-muted">
            Impossible de charger le solde Mollie.
          </div>
        </div>

        <!-- KPI cards -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
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

          <!-- Cash paid -->
          <div class="border border-default rounded-lg p-4 space-y-1">
            <p class="text-xs text-muted">
              Encaissé en liquide
            </p>
            <div v-if="loading" class="h-7 w-24 bg-muted/20 rounded animate-pulse" />
            <p v-else class="text-2xl font-light tabular-nums">
              {{ formatCents(stats?.revenue.cashPaidCents ?? 0) }} €
            </p>
            <p class="text-xs text-muted">
              Paiements cash confirmés
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
              {{ stats?.photos.sold ?? 0 }} vendues · {{ stats?.photos.unlinked ?? 0 }} en attente · {{ stats?.collections ?? 0 }} concours
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

          <!-- Unlinked photos -->
          <NuxtLink
            v-if="(stats?.photos.unlinked ?? 0) > 0"
            to="/dashboard/orders"
            class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-warning/40 bg-warning/5 text-sm hover:bg-warning/10 transition-colors"
          >
            <UIcon name="i-lucide-image-off" class="size-4 text-warning" />
            <span>
              <span class="font-medium">{{ stats?.photos.unlinked }}</span>
              photo{{ (stats?.photos.unlinked ?? 0) > 1 ? 's' : '' }} en attente de liaison
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

            <!-- Origin breakdown (stand vs site) -->
            <div class="border border-default rounded-lg overflow-hidden">
              <div class="px-5 py-3 border-b border-default">
                <h2 class="text-sm font-medium">
                  Origine des commandes
                </h2>
              </div>
              <div v-if="loading" class="px-5 py-3 space-y-3">
                <div v-for="i in 2" :key="i" class="h-4 bg-muted/20 rounded animate-pulse" />
              </div>
              <div v-else class="px-5 py-3 space-y-3">
                <div
                  v-for="item in [
                    { label: 'Stand', value: stats?.origin.stand ?? 0, color: 'bg-stone-500', icon: 'i-lucide-store' },
                    { label: 'Site', value: stats?.origin.site ?? 0, color: 'bg-blue-500', icon: 'i-lucide-globe' },
                  ]"
                  :key="item.label"
                  class="flex items-center gap-3"
                >
                  <div class="w-2 h-2 rounded-full shrink-0" :class="item.color" />
                  <UIcon :name="item.icon" class="size-3.5 text-muted" />
                  <span class="text-xs text-muted flex-1">{{ item.label }}</span>
                  <span class="text-xs font-medium tabular-nums">{{ item.value }}</span>
                </div>

                <!-- Bar chart -->
                <div
                  v-if="(stats?.orders.total ?? 0) > 0"
                  class="h-2 rounded-full overflow-hidden flex gap-px mt-1"
                >
                  <div
                    class="bg-stone-500 transition-all"
                    :style="{ width: `${((stats?.origin.stand ?? 0) / (stats?.orders.total ?? 1)) * 100}%` }"
                  />
                  <div
                    class="bg-blue-500 transition-all"
                    :style="{ width: `${((stats?.origin.site ?? 0) / (stats?.orders.total ?? 1)) * 100}%` }"
                  />
                </div>
              </div>
            </div>

            <!-- Formulas breakdown -->
            <div v-if="stats?.formulas?.length" class="border border-default rounded-lg overflow-hidden">
              <div class="px-5 py-3 border-b border-default">
                <h2 class="text-sm font-medium">
                  Commandes par formule
                </h2>
              </div>
              <div v-if="loading" class="px-5 py-3 space-y-3">
                <div v-for="i in 3" :key="i" class="h-4 bg-muted/20 rounded animate-pulse" />
              </div>
              <div v-else class="px-5 py-3 space-y-2">
                <div
                  v-for="f in [...stats.formulas].sort((a, b) => b.count - a.count)"
                  :key="f.name"
                  class="flex items-center gap-3"
                >
                  <span class="text-xs flex-1 truncate">{{ f.name }}</span>
                  <span class="text-xs font-medium tabular-nums">{{ f.count }}</span>
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
