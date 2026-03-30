<script setup lang="ts">
const toast = useToast()
const { data: orders, refresh } = await useFetch<OrderListItem[]>('/api/orders')

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
  paymentMethod: 'link' as 'link' | 'terminal' | 'cash',
  terminalId: '',
  formulaId: '' as string
})
interface PhotoItem {
  filename: string
  photoId: string | null
  collectionId: string | null
  collectionName: string | null
}

const photoItems = ref<PhotoItem[]>([])
const filenameInput = ref('')
const creating = ref(false)
const createdCheckoutUrl = ref<string | null>(null)

// Photo search
const searchResults = ref<{ id: string, filename: string, collectionId: string, collectionName: string }[]>([])
const showDropdown = ref(false)
const selectedCollectionId = ref<string | undefined>(undefined)
let searchTimeout: ReturnType<typeof setTimeout> | null = null

// Collections for filter
const { data: collectionsData } = await useFetch<CollectionListItem[]>('/api/collections')

const collectionOptions = computed(() => [
  'Toutes les collections',
  ...(collectionsData.value ?? []).map(c => c.name)
])

const selectedCollectionLabel = ref('Toutes les collections')

watch(selectedCollectionLabel, (label) => {
  const c = collectionsData.value?.find(c => c.name === label)
  selectedCollectionId.value = c?.id
})

async function searchPhotos(query: string) {
  if (query.trim().length < 2) {
    searchResults.value = []
    showDropdown.value = false
    return
  }
  try {
    const params: Record<string, string> = { q: query.trim() }
    if (selectedCollectionId.value) params.collectionId = selectedCollectionId.value
    searchResults.value = await $fetch('/api/photos/search', { params })
    showDropdown.value = true
  } catch {
    searchResults.value = []
  }
}

// Debounced search on input change
watch(filenameInput, (val) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  if (val.trim().length < 2) {
    searchResults.value = []
    showDropdown.value = false
    return
  }
  searchTimeout = setTimeout(() => searchPhotos(val), 300)
})

function selectPhoto(result: { id: string, filename: string, collectionId: string, collectionName: string }) {
  if (photoItems.value.some(p => p.photoId === result.id)) return
  if (!canAddMore.value) return
  photoItems.value.push({
    filename: result.filename,
    photoId: result.id,
    collectionId: result.collectionId,
    collectionName: result.collectionName
  })
  filenameInput.value = ''
  searchResults.value = []
  showDropdown.value = false
}

function hideDropdown() {
  setTimeout(() => { showDropdown.value = false }, 200)
}

// Backward compat
const photoFilenames = computed(() => photoItems.value.map(p => p.filename))

// Formulas
const { data: formulas } = await useFetch<PricingFormula[]>('/api/public/pricing')

const selectedFormula = computed(() => {
  if (!form.formulaId) return null
  return formulas.value?.find(f => f.id === form.formulaId) ?? null
})

const maxPhotos = computed(() => {
  const f = selectedFormula.value
  if (!f) return Infinity // sans formule = pas de limite
  if (f.isTourComplete) return Infinity // tour complet = pas de limite
  if (f.extraPhotoPriceCents != null) return Infinity // photos supplémentaires autorisées
  return f.digitalPhotosCount // pas de supplément = limité au nombre inclus
})

const canAddMore = computed(() => photoItems.value.length < maxPhotos.value)

// Trim items when switching to a more restrictive formula
watch(() => form.formulaId, () => {
  if (photoItems.value.length > maxPhotos.value) {
    photoItems.value.splice(maxPhotos.value)
  }
})

function addFilename() {
  let name = filenameInput.value.trim()
  if (!name || !canAddMore.value) return
  if (!/\.\w+$/.test(name)) name += '.jpg'
  if (!photoItems.value.some(p => p.filename === name)) {
    const col = collectionsData.value?.find(c => c.id === selectedCollectionId.value)
    photoItems.value.push({
      filename: name,
      photoId: null,
      collectionId: selectedCollectionId.value ?? null,
      collectionName: col?.name ?? null
    })
  }
  filenameInput.value = ''
  searchResults.value = []
  showDropdown.value = false
}

function removeFilename(index: number) {
  photoItems.value.splice(index, 1)
}

// Promo code
const promoInput = ref('')
const promoLoading = ref(false)
const promoError = ref<string | null>(null)
const appliedPromo = ref<{ code: string, type: 'percentage' | 'fixed', value: number } | null>(null)

const discountCents = computed(() => {
  if (!appliedPromo.value) return 0
  const total = Number(totalEuros.value) * 100
  if (appliedPromo.value.type === 'percentage') {
    return Math.round(total * appliedPromo.value.value / 100)
  }
  return Math.min(appliedPromo.value.value, total)
})

const finalTotalCents = computed(() => Math.max(0, Math.round(Number(totalEuros.value) * 100) - discountCents.value))

async function validatePromo() {
  promoError.value = null
  const code = promoInput.value.trim()
  if (!code) return
  promoLoading.value = true
  try {
    const result = await $fetch<{ valid: boolean, message?: string, code?: string, type?: string, value?: number }>('/api/public/promo-code/validate', {
      method: 'POST',
      body: { code, formulaId: form.formulaId || undefined }
    })
    if (result.valid) {
      appliedPromo.value = { code: result.code!, type: result.type as 'percentage' | 'fixed', value: result.value! }
    } else {
      promoError.value = result.message ?? 'Code invalide'
    }
  } catch {
    promoError.value = 'Erreur de validation'
  } finally {
    promoLoading.value = false
  }
}

function removePromo() {
  appliedPromo.value = null
  promoInput.value = ''
  promoError.value = null
}

// Terminals
const { data: terminals } = await useFetch<Terminal[]>('/api/orders/terminals')

function openModal() {
  form.firstName = ''
  form.lastName = ''
  form.email = ''
  form.paymentMethod = 'link'
  form.terminalId = ''
  form.formulaId = ''
  photoItems.value = []
  filenameInput.value = ''
  searchResults.value = []
  showDropdown.value = false
  selectedCollectionId.value = undefined
  selectedCollectionLabel.value = 'Toutes les collections'
  promoInput.value = ''
  promoError.value = null
  appliedPromo.value = null
  step.value = 'info'
  emailTouched.value = false
  createdCheckoutUrl.value = null
  modalOpen.value = true
}

// Settings (photo price)
const { data: appSettings } = await useFetch<Record<string, string>>('/api/settings')

const totalEuros = computed(() => {
  const count = photoItems.value.length
  if (count === 0) return '0.00'
  if (form.formulaId) {
    const f = formulas.value?.find(f => f.id === form.formulaId)
    if (f) {
      const extra = Math.max(0, count - f.digitalPhotosCount)
      const extraCost = f.extraPhotoPriceCents != null ? extra * f.extraPhotoPriceCents : 0
      return ((f.basePriceCents + extraCost) / 100).toFixed(2)
    }
  }
  const priceCents = Number(appSettings.value?.photo_price_cents ?? 500)
  return ((count * priceCents) / 100).toFixed(2)
})

async function createOrder() {
  creating.value = true
  try {
    const linkedIds = photoItems.value.filter(p => p.photoId).map(p => p.photoId!)
    const unlinkedItems = photoItems.value.filter(p => !p.photoId).map(p => ({
      filename: p.filename,
      collectionId: p.collectionId
    }))

    const result = await $fetch<{ orderId: string, checkoutUrl: string | null }>('/api/orders', {
      method: 'POST',
      body: {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        photoIds: linkedIds.length ? linkedIds : undefined,
        photoFilenames: unlinkedItems.length ? unlinkedItems : undefined,
        formulaId: form.formulaId || undefined,
        promoCode: appliedPromo.value?.code || undefined,
        paymentMethod: form.paymentMethod,
        terminalId: form.terminalId || undefined
      }
    })
    await refresh()
    if (finalTotalCents.value === 0 && appliedPromo.value) {
      toast.add({ title: 'Commande offerte (code promo 100%) — marquée payée', color: 'success' })
      modalOpen.value = false
    } else if (form.paymentMethod === 'link' && result.checkoutUrl) {
      createdCheckoutUrl.value = result.checkoutUrl
    } else if (form.paymentMethod === 'cash') {
      toast.add({ title: 'Commande enregistrée — paiement en espèces', color: 'success' })
      modalOpen.value = false
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

const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
const emailTouched = ref(false)

function canAdvance(s: typeof step.value) {
  if (s === 'info') return form.firstName && form.lastName && form.email && emailValid.value
  if (s === 'photos') return photoItems.value.length > 0
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

const BUSINESS_STATUS_LABEL: Record<string, string> = {
  in_progress: 'En cours',
  completed: 'Terminée'
}

const BUSINESS_STATUS_COLOR: Record<string, 'warning' | 'success'> = {
  in_progress: 'warning',
  completed: 'success'
}

// Search
const search = ref('')

// Date filter
type DateRange = 'today' | 'week' | 'month' | 'all'
const dateRange = ref<DateRange>('month')

const DATE_RANGE_LABEL: Record<DateRange, string> = {
  today: 'Aujourd\'hui',
  week: 'Cette semaine',
  month: 'Ce mois',
  all: 'Tout'
}

// Sort
type SortKey = 'createdAt' | 'firstName' | 'totalCents' | 'photoCount' | 'status' | 'businessStatus' | 'cashPayment'
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

  // Date filter
  if (dateRange.value !== 'all') {
    const now = new Date()
    let from: Date
    if (dateRange.value === 'today') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (dateRange.value === 'week') {
      const day = now.getDay() === 0 ? 6 : now.getDay() - 1 // lundi = 0
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day)
    } else {
      from = new Date(now.getFullYear(), now.getMonth(), 1)
    }
    rows = rows.filter(o => new Date(o.createdAt) >= from)
  }

  // Text filter
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
    } else if (sortKey.value === 'businessStatus') {
      valA = a.businessStatus
      valB = b.businessStatus
    } else if (sortKey.value === 'cashPayment') {
      valA = a.cashPayment ? 1 : 0
      valB = b.cashPayment ? 1 : 0
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
        <!-- Filters -->
        <div class="flex flex-wrap items-center gap-2">
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

          <div class="flex items-center gap-1 rounded-lg border border-default p-0.5">
            <button
              v-for="(label, key) in DATE_RANGE_LABEL"
              :key="key"
              type="button"
              class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              :class="dateRange === key
                ? 'bg-elevated text-highlighted shadow-sm'
                : 'text-muted hover:text-highlighted'"
              @click="dateRange = key"
            >
              {{ label }}
            </button>
          </div>
        </div>

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
                <!-- Sortable: Avancement -->
                <th class="text-left px-4 py-3 font-medium text-xs hidden sm:table-cell">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 text-muted hover:text-highlighted transition-colors"
                    @click="toggleSort('businessStatus')"
                  >
                    Avancement
                    <UIcon
                      :name="sortKey === 'businessStatus' ? (sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down') : 'i-lucide-arrow-up-down'"
                      class="size-3"
                      :class="sortKey === 'businessStatus' ? 'text-highlighted' : 'opacity-40'"
                    />
                  </button>
                </th>
                <!-- Sortable: Paiement -->
                <th class="text-left px-4 py-3 font-medium text-xs hidden md:table-cell">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 text-muted hover:text-highlighted transition-colors"
                    @click="toggleSort('cashPayment')"
                  >
                    Paiement
                    <UIcon
                      :name="sortKey === 'cashPayment' ? (sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down') : 'i-lucide-arrow-up-down'"
                      class="size-3"
                      :class="sortKey === 'cashPayment' ? 'text-highlighted' : 'opacity-40'"
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
                <td class="px-4 py-3 hidden sm:table-cell">
                  <UBadge
                    :color="BUSINESS_STATUS_COLOR[order.businessStatus] ?? 'neutral'"
                    variant="subtle"
                    size="sm"
                  >
                    {{ BUSINESS_STATUS_LABEL[order.businessStatus] ?? order.businessStatus }}
                  </UBadge>
                </td>
                <td class="px-4 py-3 hidden md:table-cell">
                  <div class="flex items-center gap-1.5 text-xs">
                    <UIcon
                      :name="order.cashPayment ? 'i-lucide-banknote' : 'i-lucide-credit-card'"
                      class="size-3.5 text-muted"
                    />
                    <span>{{ order.cashPayment ? 'Espèces' : 'En ligne' }}</span>
                    <UBadge
                      v-if="order.createdByAdmin !== null"
                      :color="order.createdByAdmin ? 'neutral' : 'info'"
                      variant="subtle"
                      size="xs"
                    >
                      {{ order.createdByAdmin ? 'Stand' : 'Client' }}
                    </UBadge>
                  </div>
                </td>
                <td class="px-4 py-3 hidden lg:table-cell text-xs text-muted">
                  {{ new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
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
                <td colspan="8" class="px-4 py-10 text-center text-sm text-muted">
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
            <UFormField label="E-mail" :error="emailTouched && form.email && !emailValid ? 'Adresse e-mail invalide' : undefined">
              <UInput v-model="form.email" type="email" placeholder="marie@example.com" :color="emailTouched && form.email && !emailValid ? 'error' : 'neutral'" class="w-full" @blur="emailTouched = true" />
            </UFormField>
          </div>
        </template>

        <!-- Step 2 – Photos (filenames) + Formula -->
        <template v-else-if="step === 'photos'">
          <div class="space-y-4">
            <!-- Formula selector -->
            <div class="space-y-2">
              <label class="text-sm font-medium">Formule</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  class="px-3 py-2 rounded-lg border-2 text-left text-sm transition-colors"
                  :class="!form.formulaId ? 'border-primary bg-primary/5' : 'border-default hover:border-muted'"
                  @click="form.formulaId = ''"
                >
                  <p class="font-medium">Sans formule</p>
                  <p class="text-xs text-muted">Prix par photo</p>
                </button>
                <button
                  v-for="f in formulas"
                  :key="f.id"
                  type="button"
                  class="px-3 py-2 rounded-lg border-2 text-left text-sm transition-colors"
                  :class="form.formulaId === f.id ? 'border-primary bg-primary/5' : 'border-default hover:border-muted'"
                  @click="form.formulaId = f.id"
                >
                  <p class="font-medium">{{ f.name }}</p>
                  <p class="text-xs text-muted">{{ (f.basePriceCents / 100).toFixed(2) }} € — {{ f.digitalPhotosCount }} photos</p>
                </button>
              </div>
            </div>

            <!-- Formula info -->
            <div v-if="selectedFormula" class="rounded-lg bg-elevated/40 px-3 py-2 text-xs space-y-1">
              <p>
                <span class="font-medium">{{ selectedFormula.digitalPhotosCount }}</span> photo{{ selectedFormula.digitalPhotosCount !== 1 ? 's' : '' }} incluse{{ selectedFormula.digitalPhotosCount !== 1 ? 's' : '' }}
              </p>
              <p v-if="selectedFormula.extraPhotoPriceCents != null" class="text-muted">
                Photo supplémentaire : {{ (selectedFormula.extraPhotoPriceCents / 100).toFixed(2) }} € / photo
              </p>
              <p v-else-if="!selectedFormula.isTourComplete" class="text-muted">
                Pas de photo supplémentaire possible
              </p>
              <p v-if="selectedFormula.isTourComplete" class="text-muted">
                Tour complet — nombre illimité
              </p>
            </div>

            <!-- Photo search -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium">Photos</label>
                <span v-if="maxPhotos !== Infinity" class="text-xs text-muted tabular-nums">
                  {{ photoItems.length }} / {{ maxPhotos }}
                </span>
              </div>

              <!-- Collection filter -->
              <USelect
                v-model="selectedCollectionLabel"
                :items="collectionOptions"
                size="sm"
                color="neutral"
                class="w-full"
              />

              <!-- Search input -->
              <div class="relative">
                <form class="flex gap-2" @submit.prevent="addFilename">
                  <UInput
                    v-model="filenameInput"
                    placeholder="Rechercher ou saisir un nom de photo…"
                    size="sm"
                    color="neutral"
                    class="flex-1"
                    :disabled="!canAddMore"
                    @focus="filenameInput.trim().length >= 2 && (showDropdown = true)"
                    @blur="hideDropdown"
                    @keydown.enter.prevent="addFilename"
                  />
                  <UButton
                    type="submit"
                    icon="i-lucide-plus"
                    color="neutral"
                    size="sm"
                    :disabled="!filenameInput.trim() || !canAddMore"
                  >
                    Ajouter
                  </UButton>
                </form>

                <!-- Search dropdown -->
                <div
                  v-if="showDropdown && searchResults.length"
                  class="absolute left-0 right-12 top-full mt-1 z-50 border border-default rounded-lg bg-default shadow-lg max-h-48 overflow-y-auto"
                >
                  <button
                    v-for="result in searchResults"
                    :key="result.id"
                    type="button"
                    class="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-elevated/50 transition-colors"
                    :class="{ 'opacity-40 cursor-not-allowed': photoItems.some(p => p.photoId === result.id) }"
                    :disabled="photoItems.some(p => p.photoId === result.id)"
                    @mousedown.prevent="selectPhoto(result)"
                  >
                    <UIcon name="i-lucide-image" class="size-3.5 text-success shrink-0" />
                    <div class="min-w-0 flex-1">
                      <p class="truncate">{{ result.filename }}</p>
                      <p class="text-[10px] text-muted truncate">{{ result.collectionName }}</p>
                    </div>
                    <UIcon v-if="photoItems.some(p => p.photoId === result.id)" name="i-lucide-check" class="size-3.5 text-success shrink-0" />
                  </button>
                </div>
              </div>

              <p v-if="!canAddMore" class="text-xs text-warning">
                Nombre maximum de photos atteint pour cette formule.
              </p>
              <p v-else class="text-xs text-muted">
                Sélectionnez une photo existante ou tapez un nom pour une liaison différée.
              </p>
            </div>

            <!-- Photo list -->
            <div v-if="photoItems.length" class="space-y-1 max-h-60 overflow-y-auto">
              <div
                v-for="(item, idx) in photoItems"
                :key="idx"
                class="flex items-center justify-between px-3 py-2 rounded-lg border border-default text-sm"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <UIcon
                    :name="item.photoId ? 'i-lucide-image' : 'i-lucide-image-off'"
                    class="size-3.5 shrink-0"
                    :class="item.photoId ? 'text-success' : 'text-muted'"
                  />
                  <div class="min-w-0">
                    <span class="truncate block">{{ item.filename }}</span>
                    <span v-if="item.collectionName" class="text-[10px] text-muted truncate block">{{ item.collectionName }}</span>
                    <span v-else class="text-[10px] text-muted/50 italic block">Liaison différée</span>
                  </div>
                </div>
                <button
                  type="button"
                  class="text-muted hover:text-error shrink-0"
                  @click="removeFilename(idx)"
                >
                  <UIcon name="i-lucide-x" class="size-3.5" />
                </button>
              </div>
            </div>

            <!-- Summary -->
            <div class="text-xs text-muted space-y-0.5">
              <p>
                {{ photoItems.length }} photo{{ photoItems.length !== 1 ? 's' : '' }}
                <span v-if="photoItems.length > 0"> — {{ totalEuros }} €</span>
              </p>
              <p v-if="selectedFormula && photoItems.length > selectedFormula.digitalPhotosCount && selectedFormula.extraPhotoPriceCents != null">
                dont {{ photoItems.length - selectedFormula.digitalPhotosCount }} supplémentaire{{ photoItems.length - selectedFormula.digitalPhotosCount !== 1 ? 's' : '' }}
                (+{{ (((photoItems.length - selectedFormula.digitalPhotosCount) * selectedFormula.extraPhotoPriceCents) / 100).toFixed(2) }} €)
              </p>
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
            <p class="text-sm font-medium mb-1">
              {{ photoFilenames.length }} photo{{ photoFilenames.length !== 1 ? 's' : '' }} — {{ totalEuros }} €
            </p>
            <p v-if="appliedPromo" class="text-sm font-medium text-green-600 dark:text-green-400 mb-4">
              Remise : -{{ (discountCents / 100).toFixed(2) }} € → {{ (finalTotalCents / 100).toFixed(2) }} €
            </p>
            <p v-else class="mb-4" />

            <!-- Promo code -->
            <div class="mb-5">
              <label class="text-xs font-medium">Code promo</label>
              <template v-if="appliedPromo">
                <div class="flex items-center gap-2 mt-1.5">
                  <UBadge color="success" variant="subtle" size="sm">
                    <UIcon name="i-lucide-ticket" class="size-3 mr-1" />
                    {{ appliedPromo.code }}
                    <span class="ml-1 text-muted">
                      ({{ appliedPromo.type === 'percentage' ? `-${appliedPromo.value}%` : `-${(appliedPromo.value / 100).toFixed(2)} €` }})
                    </span>
                  </UBadge>
                  <UButton
                    icon="i-lucide-x"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    square
                    @click="removePromo"
                  />
                </div>
              </template>
              <template v-else>
                <div class="flex gap-2 mt-1.5">
                  <UInput
                    v-model="promoInput"
                    placeholder="Entrer un code"
                    size="sm"
                    class="flex-1"
                    @keydown.enter.prevent="validatePromo"
                  />
                  <UButton
                    color="neutral"
                    variant="outline"
                    size="sm"
                    :disabled="!promoInput.trim() || promoLoading"
                    @click="validatePromo"
                  >
                    {{ promoLoading ? '…' : 'Appliquer' }}
                  </UButton>
                </div>
                <p v-if="promoError" class="text-xs text-red-500 mt-1">
                  {{ promoError }}
                </p>
              </template>
            </div>

            <!-- Method selection -->
            <div class="grid grid-cols-3 gap-3 mb-5">
              <button
                type="button"
                class="flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors text-sm"
                :class="form.paymentMethod === 'link' ? 'border-primary bg-primary/5' : 'border-default hover:border-muted'"
                @click="form.paymentMethod = 'link'"
              >
                <UIcon name="i-lucide-link" class="size-5" />
                <span class="font-medium">Lien</span>
                <span class="text-xs text-muted text-center">Lien Mollie au client</span>
              </button>
              <button
                type="button"
                class="flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors text-sm"
                :class="form.paymentMethod === 'terminal' ? 'border-primary bg-primary/5' : 'border-default hover:border-muted'"
                @click="form.paymentMethod = 'terminal'"
              >
                <UIcon name="i-lucide-credit-card" class="size-5" />
                <span class="font-medium">Terminal</span>
                <span class="text-xs text-muted text-center">Paiement via TPE</span>
              </button>
              <button
                type="button"
                class="flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors text-sm"
                :class="form.paymentMethod === 'cash' ? 'border-primary bg-primary/5' : 'border-default hover:border-muted'"
                @click="form.paymentMethod = 'cash'"
              >
                <UIcon name="i-lucide-banknote" class="size-5" />
                <span class="font-medium">Espèces</span>
                <span class="text-xs text-muted text-center">Paiement au stand</span>
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
            {{ form.paymentMethod === 'terminal' ? 'Envoyer au terminal' : form.paymentMethod === 'cash' ? 'Enregistrer' : 'Créer le lien' }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
