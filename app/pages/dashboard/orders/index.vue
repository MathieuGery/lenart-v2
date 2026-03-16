<script setup lang="ts">
const toast = useToast()
const { data: orders, refresh } = await useFetch('/api/orders')

const syncing = ref(false)
async function syncOrders() {
  syncing.value = true
  try {
    const { synced, updated } = await $fetch<{ synced: number, updated: number }>('/api/orders/sync', { method: 'POST' })
    await refresh()
    if (synced === 0) {
      toast.add({ title: 'Aucune commande en attente à synchroniser', color: 'neutral' })
    } else {
      toast.add({ title: `${updated} commande${updated !== 1 ? 's' : ''} mise${updated !== 1 ? 's' : ''} à jour sur ${synced}` })
    }
  } catch {
    toast.add({ title: 'Erreur lors de la synchronisation', color: 'error' })
  } finally {
    syncing.value = false
  }
}

// ── New order modal ──────────────────────────────────────────────────────────
const modalOpen = ref(false)
const step = ref<'info' | 'photos' | 'payment'>('info')

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  paymentMethod: 'link' as 'link' | 'terminal',
  terminalId: ''
})
const selectedPhotoIds = ref<string[]>([])
const creating = ref(false)
const createdCheckoutUrl = ref<string | null>(null)

// Collections + photo picker
const { data: collections } = await useFetch('/api/collections')
const expandedCollection = ref<string | null>(null)
const collectionPhotos = ref<Record<string, { id: string, filename: string, url: string }[]>>({})

async function toggleCollection(id: string) {
  if (expandedCollection.value === id) {
    expandedCollection.value = null
    return
  }
  expandedCollection.value = id
  if (!collectionPhotos.value[id]) {
    const data = await $fetch<{ photos: { id: string, filename: string, url: string }[] }>(`/api/collections/${id}`)
    collectionPhotos.value[id] = data.photos
  }
}

function togglePhoto(id: string) {
  const idx = selectedPhotoIds.value.indexOf(id)
  if (idx === -1) selectedPhotoIds.value.push(id)
  else selectedPhotoIds.value.splice(idx, 1)
}

// Terminals
const { data: terminals } = await useFetch('/api/orders/terminals')

function openModal() {
  form.firstName = ''
  form.lastName = ''
  form.email = ''
  form.paymentMethod = 'link'
  form.terminalId = ''
  selectedPhotoIds.value = []
  expandedCollection.value = null
  step.value = 'info'
  createdCheckoutUrl.value = null
  modalOpen.value = true
}

const priceCents = useRuntimeConfig().public.photoPriceCents
const totalEuros = computed(() => ((selectedPhotoIds.value.length * Number(priceCents)) / 100).toFixed(2))

async function createOrder() {
  creating.value = true
  try {
    const result = await $fetch<{ orderId: string, checkoutUrl: string | null }>('/api/orders', {
      method: 'POST',
      body: {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        photoIds: selectedPhotoIds.value,
        paymentMethod: form.paymentMethod,
        terminalId: form.terminalId || undefined
      }
    })
    await refresh()
    if (form.paymentMethod === 'link' && result.checkoutUrl) {
      createdCheckoutUrl.value = result.checkoutUrl
    } else {
      toast.add({ title: 'Commande envoyée au terminal', color: 'success' })
      modalOpen.value = false
    }
  } catch (e: unknown) {
    toast.add({ title: (e as { data?: { message?: string } })?.data?.message ?? 'Erreur lors de la création', color: 'error' })
  } finally {
    creating.value = false
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

function canAdvance(s: typeof step.value) {
  if (s === 'info') return form.firstName && form.lastName && form.email
  if (s === 'photos') return selectedPhotoIds.value.length > 0
  return true
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
          <UButton
            icon="i-lucide-arrow-down-up"
            color="neutral"
            variant="outline"
            size="sm"
            :loading="syncing"
            @click="syncOrders()"
          >
            Sync Mollie
          </UButton>
          <UButton
            icon="i-lucide-plus"
            color="neutral"
            size="sm"
            @click="openModal()"
          >
            Nouvelle commande
          </UButton>
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

  <!-- New order modal -->
  <UModal v-model:open="modalOpen" :ui="{ content: 'max-w-xl' }">
    <template #content>
      <div class="p-6">

        <!-- Header + steps -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-base font-medium">
            Nouvelle commande
          </h2>
          <div class="flex items-center gap-1 text-xs text-muted">
            <span :class="step === 'info' ? 'text-highlighted font-medium' : ''">1. Client</span>
            <UIcon name="i-lucide-chevron-right" class="size-3" />
            <span :class="step === 'photos' ? 'text-highlighted font-medium' : ''">2. Photos</span>
            <UIcon name="i-lucide-chevron-right" class="size-3" />
            <span :class="step === 'payment' ? 'text-highlighted font-medium' : ''">3. Paiement</span>
          </div>
        </div>

        <!-- Step 1 – Customer info -->
        <template v-if="step === 'info'">
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <UFormField label="Prénom">
                <UInput v-model="form.firstName" placeholder="Marie" color="neutral" class="w-full" />
              </UFormField>
              <UFormField label="Nom">
                <UInput v-model="form.lastName" placeholder="Dupont" color="neutral" class="w-full" />
              </UFormField>
            </div>
            <UFormField label="E-mail">
              <UInput v-model="form.email" type="email" placeholder="marie@example.com" color="neutral" class="w-full" />
            </UFormField>
          </div>
        </template>

        <!-- Step 2 – Photo picker -->
        <template v-else-if="step === 'photos'">
          <p class="text-xs text-muted mb-3">
            {{ selectedPhotoIds.length }} photo{{ selectedPhotoIds.length !== 1 ? 's' : '' }} sélectionnée{{ selectedPhotoIds.length !== 1 ? 's' : '' }}
            <span v-if="selectedPhotoIds.length > 0"> — {{ totalEuros }} €</span>
          </p>
          <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
            <div
              v-for="col in collections"
              :key="col.id"
              class="border border-default rounded-lg overflow-hidden"
            >
              <button
                type="button"
                class="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-elevated/40 transition-colors"
                @click="toggleCollection(col.id)"
              >
                <span class="font-medium truncate">{{ col.name }}</span>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-xs text-muted">{{ col.photoCount }} photos</span>
                  <UIcon
                    :name="expandedCollection === col.id ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                    class="size-3.5 text-muted"
                  />
                </div>
              </button>
              <div v-if="expandedCollection === col.id" class="border-t border-default p-2">
                <div v-if="!collectionPhotos[col.id]" class="py-4 text-center text-xs text-muted">
                  Chargement…
                </div>
                <div v-else class="grid grid-cols-5 gap-1.5">
                  <button
                    v-for="photo in collectionPhotos[col.id]"
                    :key="photo.id"
                    type="button"
                    class="relative aspect-4/3 rounded overflow-hidden bg-muted/10"
                    :title="photo.filename"
                    @click="togglePhoto(photo.id)"
                  >
                    <img :src="photo.url" :alt="photo.filename" class="size-full object-cover">
                    <div
                      v-if="selectedPhotoIds.includes(photo.id)"
                      class="absolute inset-0 bg-primary/40 ring-2 ring-inset ring-primary rounded flex items-center justify-center"
                    >
                      <UIcon name="i-lucide-check" class="size-4 text-white" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Step 3 – Payment -->
        <template v-else-if="step === 'payment'">
          <!-- If order was created with link -->
          <template v-if="createdCheckoutUrl">
            <div class="flex items-start gap-3 mb-5 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <UIcon name="i-lucide-check-circle" class="size-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <div>
                <p class="text-sm font-medium">Commande créée</p>
                <p class="text-xs text-muted mt-0.5">Partagez ce lien avec le client pour qu'il procède au paiement.</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <UInput :model-value="createdCheckoutUrl" readonly color="neutral" size="sm" class="flex-1 font-mono text-xs" />
              <UButton
                icon="i-lucide-copy"
                color="neutral"
                variant="outline"
                size="sm"
                square
                @click="copyToClipboard(createdCheckoutUrl)"
              />
            </div>
          </template>

          <template v-else>
            <p class="text-sm font-medium mb-4">
              {{ selectedPhotoIds.length }} photo{{ selectedPhotoIds.length !== 1 ? 's' : '' }} — {{ totalEuros }} €
            </p>

            <!-- Method selection -->
            <div class="grid grid-cols-2 gap-3 mb-5">
              <button
                type="button"
                class="flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors text-sm"
                :class="form.paymentMethod === 'link' ? 'border-primary bg-primary/5' : 'border-default hover:border-muted'"
                @click="form.paymentMethod = 'link'"
              >
                <UIcon name="i-lucide-link" class="size-5" />
                <span class="font-medium">Lien de paiement</span>
                <span class="text-xs text-muted text-center">Envoyez un lien Mollie au client</span>
              </button>
              <button
                type="button"
                class="flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors text-sm"
                :class="form.paymentMethod === 'terminal' ? 'border-primary bg-primary/5' : 'border-default hover:border-muted'"
                @click="form.paymentMethod = 'terminal'"
              >
                <UIcon name="i-lucide-credit-card" class="size-5" />
                <span class="font-medium">Terminal</span>
                <span class="text-xs text-muted text-center">Paiement sur place via TPE</span>
              </button>
            </div>

            <!-- Terminal selector -->
            <div v-if="form.paymentMethod === 'terminal'" class="mb-5">
              <div v-if="!terminals?.length" class="text-sm text-muted p-3 rounded-lg border border-default text-center">
                Aucun terminal disponible.
              </div>
              <div v-else class="space-y-2">
                <p class="text-xs font-medium text-muted mb-2">
                  Sélectionner un terminal
                </p>
                <button
                  v-for="t in terminals"
                  :key="t.id"
                  type="button"
                  class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-sm transition-colors"
                  :class="form.terminalId === t.id ? 'border-primary bg-primary/5' : 'border-default hover:border-muted'"
                  @click="form.terminalId = t.id"
                >
                  <!-- Icon selon le type -->
                  <div class="shrink-0 size-8 rounded-lg flex items-center justify-center" :class="t.brand === 'Tap' ? 'bg-stone-100 dark:bg-stone-800' : 'bg-muted/10'">
                    <UIcon
                      :name="t.brand === 'Tap' ? 'i-lucide-smartphone' : 'i-lucide-credit-card'"
                      class="size-4"
                      :class="t.brand === 'Tap' ? 'text-stone-600 dark:text-stone-300' : 'text-muted'"
                    />
                  </div>
                  <div class="flex-1 text-left min-w-0">
                    <div class="flex items-center gap-2">
                      <p class="font-medium truncate">
                        {{ t.description || t.id }}
                      </p>
                      <UBadge
                        v-if="t.brand === 'Tap'"
                        size="xs"
                        color="neutral"
                        variant="subtle"
                      >
                        Tap to Pay
                      </UBadge>
                    </div>
                    <p class="text-xs text-muted">
                      <span v-if="t.model">{{ t.model }}</span>
                      <span v-if="t.model && t.serialNumber"> · </span>
                      <span v-if="t.serialNumber">{{ t.serialNumber }}</span>
                      <span v-if="!t.model && !t.serialNumber">{{ t.currency }}</span>
                    </p>
                  </div>
                  <div
                    v-if="form.terminalId === t.id"
                    class="size-4 rounded-full bg-primary flex items-center justify-center shrink-0"
                  >
                    <UIcon name="i-lucide-check" class="size-2.5 text-(--ui-bg)" />
                  </div>
                </button>
              </div>
            </div>
          </template>
        </template>

        <!-- Footer actions -->
        <div class="flex justify-between mt-6 pt-4 border-t border-default">
          <UButton
            v-if="step !== 'info' && !createdCheckoutUrl"
            color="neutral"
            variant="ghost"
            @click="step = step === 'payment' ? 'photos' : 'info'"
          >
            Retour
          </UButton>
          <UButton
            v-else-if="createdCheckoutUrl"
            color="neutral"
            variant="ghost"
            @click="modalOpen = false"
          >
            Fermer
          </UButton>
          <span v-else />

          <UButton
            v-if="step === 'info'"
            color="neutral"
            :disabled="!canAdvance('info')"
            trailing-icon="i-lucide-arrow-right"
            @click="step = 'photos'"
          >
            Suivant
          </UButton>
          <UButton
            v-else-if="step === 'photos'"
            color="neutral"
            :disabled="!canAdvance('photos')"
            trailing-icon="i-lucide-arrow-right"
            @click="step = 'payment'"
          >
            Suivant
          </UButton>
          <UButton
            v-else-if="step === 'payment' && !createdCheckoutUrl"
            color="neutral"
            :loading="creating"
            :disabled="form.paymentMethod === 'terminal' && !form.terminalId"
            trailing-icon="i-lucide-send"
            @click="createOrder()"
          >
            {{ form.paymentMethod === 'terminal' ? 'Envoyer au terminal' : 'Créer le lien' }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
