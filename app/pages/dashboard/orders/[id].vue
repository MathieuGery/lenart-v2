<script setup lang="ts">
const route = useRoute()
const id = route.params.id as string
const toast = useToast()

const { data: order, refresh } = await useFetch(`/api/orders/${id}`)

if (!order.value) {
  throw createError({ statusCode: 404, message: 'Commande introuvable' })
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

const updating = ref(false)
const selectedStatus = ref(order.value?.status ?? 'pending')

async function updateStatus() {
  updating.value = true
  try {
    await $fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      body: { status: selectedStatus.value }
    })
    await refresh()
    toast.add({ title: 'Statut mis à jour' })
  } catch {
    toast.add({ title: 'Erreur lors de la mise à jour', color: 'error' })
  } finally {
    updating.value = false
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="`Commande #${id.slice(0, 8).toUpperCase()}`">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="order" class="p-6 max-w-4xl space-y-6">
        <!-- Back -->
        <NuxtLink
          to="/dashboard/orders"
          class="inline-flex items-center gap-1.5 text-xs text-muted hover:text-highlighted transition-colors"
        >
          <UIcon name="i-lucide-arrow-left" class="size-3.5" />
          Retour aux commandes
        </NuxtLink>

        <!-- Header card -->
        <div class="border border-default rounded-lg p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <p class="text-xs text-muted mb-1">
              Client
            </p>
            <p class="text-sm font-medium">
              {{ order.firstName }} {{ order.lastName }}
            </p>
            <p class="text-xs text-muted">
              {{ order.email }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted mb-1">
              Formule
            </p>
            <p class="text-sm font-medium">
              {{ order.formulaName ?? '—' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted mb-1">
              Photos
            </p>
            <p class="text-sm font-medium">
              {{ order.photos.length }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted mb-1">
              Total
            </p>
            <p class="text-sm font-medium">
              {{ (order.totalCents / 100).toFixed(2) }} €
            </p>
          </div>
          <div>
            <p class="text-xs text-muted mb-1">
              Paiement
            </p>
            <p class="text-sm font-medium">
              {{ order.cashPayment ? 'Espèces' : 'En ligne' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted mb-1">
              Date
            </p>
            <p class="text-sm">
              {{ new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }}
            </p>
          </div>
        </div>

        <!-- Status -->
        <div class="border border-default rounded-lg p-5">
          <h2 class="text-sm font-medium mb-4">
            Statut de la commande
          </h2>
          <div class="flex items-center gap-3">
            <UBadge
              :color="STATUS_COLOR[order.status] ?? 'neutral'"
              variant="subtle"
              size="md"
            >
              {{ STATUS_LABEL[order.status] ?? order.status }}
            </UBadge>
            <span class="text-muted text-xs">→</span>
            <USelect
              v-model="selectedStatus"
              :items="Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))"
              size="sm"
              color="neutral"
              class="w-40"
            />
            <UButton
              size="sm"
              color="neutral"
              :loading="updating"
              :disabled="selectedStatus === order.status"
              @click="updateStatus"
            >
              Appliquer
            </UButton>
          </div>
        </div>

        <!-- Photos -->
        <div class="border border-default rounded-lg p-5">
          <h2 class="text-sm font-medium mb-4">
            Photos commandées ({{ order.photos.length }})
          </h2>
          <div
            v-if="order.photos.length"
            class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2"
          >
            <a
              v-for="photo in order.photos"
              :key="photo.id"
              :href="photo.url"
              target="_blank"
              class="relative aspect-4/3 rounded overflow-hidden bg-muted/10 block group"
              :title="photo.filename"
            >
              <img
                :src="photo.url"
                :alt="photo.filename"
                class="size-full object-cover transition-all duration-200 group-hover:brightness-75"
              >
              <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <UIcon name="i-lucide-external-link" class="size-4 text-white" />
              </div>
            </a>
          </div>
          <p v-else class="text-sm text-muted">
            Aucune photo associée.
          </p>
        </div>

        <!-- Mollie ID -->
        <div v-if="order.molliePaymentId" class="text-xs text-muted">
          Mollie ID : <span class="font-mono">{{ order.molliePaymentId }}</span>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
