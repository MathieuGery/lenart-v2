<script setup lang="ts">
const route = useRoute()
const email = decodeURIComponent(route.params.email as string)

const { data: customer, status } = await useFetch<CustomerDetail>(`/api/customers/${encodeURIComponent(email)}`)

const loading = computed(() => status.value === 'pending')

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

const BUSINESS_LABEL: Record<string, string> = {
  in_progress: 'En cours',
  completed: 'Terminée'
}

function formatCents(cents: number) {
  return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <div class="flex items-center gap-2">
            <UDashboardSidebarCollapse id="default" />
            <UButton
              to="/dashboard/customers"
              icon="i-lucide-arrow-left"
              variant="ghost"
              size="sm"
            />
            <span class="text-sm font-medium">{{ customer?.firstName }} {{ customer?.lastName }}</span>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Loading -->
      <div v-if="loading" class="p-6 space-y-6 max-w-6xl">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div v-for="i in 4" :key="i" class="border border-default rounded-lg p-4 space-y-2">
            <div class="h-3 w-16 bg-muted/20 rounded animate-pulse" />
            <div class="h-7 w-24 bg-muted/20 rounded animate-pulse" />
          </div>
        </div>
      </div>

      <div v-else-if="customer" class="p-6 space-y-6 max-w-6xl">
        <!-- Customer info + stats -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Info card -->
          <div class="border border-default rounded-lg overflow-hidden">
            <div class="px-5 py-3 border-b border-default">
              <h2 class="text-sm font-medium">Informations</h2>
            </div>
            <div class="px-5 py-4 space-y-3">
              <div>
                <p class="text-[10px] uppercase tracking-wider text-muted mb-0.5">Nom</p>
                <p class="text-sm font-medium">{{ customer.firstName }} {{ customer.lastName }}</p>
              </div>
              <div>
                <p class="text-[10px] uppercase tracking-wider text-muted mb-0.5">Email</p>
                <p class="text-sm">{{ customer.email }}</p>
              </div>
              <div v-if="customer.address">
                <p class="text-[10px] uppercase tracking-wider text-muted mb-0.5">Adresse</p>
                <p class="text-sm">{{ customer.address }}</p>
                <p v-if="customer.postalCode || customer.city" class="text-sm">
                  {{ customer.postalCode }} {{ customer.city }}
                </p>
                <p v-if="customer.country" class="text-sm text-muted">{{ customer.country }}</p>
              </div>
              <div>
                <p class="text-[10px] uppercase tracking-wider text-muted mb-0.5">Client depuis</p>
                <p class="text-sm">{{ formatDate(customer.firstOrderAt) }}</p>
              </div>
            </div>
          </div>

          <!-- Stats cards -->
          <div class="lg:col-span-2 grid grid-cols-2 gap-4 content-start">
            <div class="border border-default rounded-lg p-4 space-y-1">
              <p class="text-xs text-muted">Commandes payées</p>
              <p class="text-2xl font-light tabular-nums">{{ customer.paidOrderCount }}</p>
              <p class="text-xs text-muted">sur {{ customer.orderCount }} au total</p>
            </div>
            <div class="border border-default rounded-lg p-4 space-y-1">
              <p class="text-xs text-muted">Total dépensé</p>
              <p class="text-2xl font-light tabular-nums">{{ formatCents(customer.totalSpentCents) }} €</p>
              <p class="text-xs text-muted">Commandes payées uniquement</p>
            </div>
            <div class="border border-default rounded-lg p-4 space-y-1">
              <p class="text-xs text-muted">Photos commandées</p>
              <p class="text-2xl font-light tabular-nums">{{ customer.totalPhotoCount }}</p>
              <p class="text-xs text-muted">Toutes commandes</p>
            </div>
            <div class="border border-default rounded-lg p-4 space-y-1">
              <p class="text-xs text-muted">Panier moyen</p>
              <p class="text-2xl font-light tabular-nums">
                {{ customer.paidOrderCount ? formatCents(Math.round(customer.totalSpentCents / customer.paidOrderCount)) : '0,00' }} €
              </p>
              <p class="text-xs text-muted">Par commande payée</p>
            </div>
          </div>
        </div>

        <!-- Orders list -->
        <div class="border border-default rounded-lg overflow-hidden">
          <div class="px-5 py-3 border-b border-default">
            <h2 class="text-sm font-medium">Historique des commandes</h2>
          </div>

          <div class="divide-y divide-default">
            <div class="grid grid-cols-12 gap-4 px-5 py-2 text-xs text-muted font-medium uppercase tracking-wider bg-elevated/30">
              <div class="col-span-2">Date</div>
              <div class="col-span-2">Formule</div>
              <div class="col-span-1 text-center">Photos</div>
              <div class="col-span-2 text-center">Origine</div>
              <div class="col-span-2 text-center">Statut</div>
              <div class="col-span-1 text-center">Traitement</div>
              <div class="col-span-2 text-right">Montant</div>
            </div>

            <NuxtLink
              v-for="order in customer.orders"
              :key="order.id"
              :to="`/dashboard/orders/${order.id}`"
              class="grid grid-cols-12 gap-4 px-5 py-3 hover:bg-elevated/30 transition-colors items-center"
            >
              <div class="col-span-2">
                <p class="text-sm">{{ formatDate(order.createdAt) }}</p>
              </div>
              <div class="col-span-2">
                <p class="text-sm truncate">{{ order.formulaName ?? '-' }}</p>
              </div>
              <div class="col-span-1 text-center">
                <span class="text-sm tabular-nums">{{ order.photoCount }}</span>
              </div>
              <div class="col-span-2 text-center">
                <UBadge
                  :color="order.createdByAdmin ? 'neutral' : 'info'"
                  variant="subtle"
                  size="sm"
                >
                  <UIcon :name="order.createdByAdmin ? 'i-lucide-store' : 'i-lucide-globe'" class="size-3" />
                  {{ order.createdByAdmin ? 'Stand' : 'Site' }}
                </UBadge>
              </div>
              <div class="col-span-2 text-center">
                <UBadge
                  :color="STATUS_COLOR[order.status] ?? 'neutral'"
                  variant="subtle"
                  size="sm"
                >
                  {{ STATUS_LABEL[order.status] ?? order.status }}
                </UBadge>
                <UIcon
                  v-if="order.cashPayment"
                  name="i-lucide-banknote"
                  class="size-3.5 text-muted ml-1"
                />
              </div>
              <div class="col-span-1 text-center">
                <UBadge
                  :color="order.businessStatus === 'completed' ? 'success' : 'warning'"
                  variant="subtle"
                  size="sm"
                >
                  {{ BUSINESS_LABEL[order.businessStatus] ?? order.businessStatus }}
                </UBadge>
              </div>
              <div class="col-span-2 text-right">
                <span class="text-sm font-medium tabular-nums">{{ formatCents(order.totalCents) }} €</span>
              </div>
            </NuxtLink>
          </div>

          <div v-if="!customer.orders.length" class="px-5 py-10 text-center">
            <p class="text-sm text-muted">Aucune commande.</p>
          </div>
        </div>
      </div>

      <!-- Not found -->
      <div v-else class="p-6 text-center">
        <UIcon name="i-lucide-user-x" class="size-8 text-muted/40 mx-auto mb-3" />
        <p class="text-sm text-muted">Client introuvable.</p>
        <UButton to="/dashboard/customers" variant="ghost" size="sm" class="mt-4">
          Retour aux clients
        </UButton>
      </div>
    </template>
  </UDashboardPanel>
</template>
