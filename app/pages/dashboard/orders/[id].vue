<script setup lang="ts">
const route = useRoute()
const id = route.params.id as string
const toast = useToast()

const { data: order, refresh } = await useFetch<OrderDetail>(`/api/orders/${id}`)

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

// Status update
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

// Amazon link
const amazonLinkInput = ref(order.value?.amazonLink ?? '')
const savingAmazonLink = ref(false)

async function saveAmazonLink() {
  savingAmazonLink.value = true
  try {
    await $fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      body: { amazonLink: amazonLinkInput.value || null }
    })
    await refresh()
    toast.add({ title: 'Lien Amazon mis à jour', color: 'success' })
  } catch {
    toast.add({ title: 'Lien invalide', color: 'error' })
  } finally {
    savingAmazonLink.value = false
  }
}

watch(() => order.value?.amazonLink, (v) => {
  amazonLinkInput.value = v ?? ''
})

// Edit mode
const editing = ref(false)
const saving = ref(false)

const editForm = reactive({
  firstName: '',
  lastName: '',
  email: '',
  formulaId: '' as string
})
const editFilenames = ref<string[]>([])
const editFilenameInput = ref('')

// Settings (photo price)
const { data: appSettings } = await useFetch<Record<string, string>>('/api/settings')

// Formulas
const { data: formulas } = await useFetch<PricingFormula[]>('/api/public/pricing')

const selectedFormula = computed(() => {
  if (!editForm.formulaId) return null
  return formulas.value?.find(f => f.id === editForm.formulaId) ?? null
})

const maxPhotos = computed(() => {
  const f = selectedFormula.value
  if (!f) return Infinity
  if (f.isTourComplete) return Infinity
  if (f.extraPhotoPriceCents != null) return Infinity
  return f.digitalPhotosCount
})

const canAddMore = computed(() => editFilenames.value.length < maxPhotos.value)

watch(() => editForm.formulaId, () => {
  if (editFilenames.value.length > maxPhotos.value) {
    editFilenames.value.splice(maxPhotos.value)
  }
})

const editTotalEuros = computed(() => {
  const count = editFilenames.value.length
  if (count === 0) return '0.00'
  if (editForm.formulaId) {
    const f = selectedFormula.value
    if (f) {
      const extra = Math.max(0, count - f.digitalPhotosCount)
      const extraCost = f.extraPhotoPriceCents != null ? extra * f.extraPhotoPriceCents : 0
      return ((f.basePriceCents + extraCost) / 100).toFixed(2)
    }
  }
  const priceCents = Number(appSettings.value?.photo_price_cents ?? 500)
  return ((count * priceCents) / 100).toFixed(2)
})

function startEditing() {
  if (!order.value) return
  editForm.firstName = order.value.firstName
  editForm.lastName = order.value.lastName
  editForm.email = order.value.email
  // Find formula ID by name
  const f = formulas.value?.find(f => f.name === order.value!.formulaName)
  editForm.formulaId = f?.id ?? ''
  editFilenames.value = order.value.photos.map((p: OrderPhoto) => p.filename).filter((n): n is string => !!n)
  editFilenameInput.value = ''
  editing.value = true
}

function cancelEditing() {
  editing.value = false
}

function addEditFilename() {
  let name = editFilenameInput.value.trim()
  if (!name || !canAddMore.value) return
  if (!/\.\w+$/.test(name)) name += '.jpg'
  if (!editFilenames.value.includes(name)) {
    editFilenames.value.push(name)
  }
  editFilenameInput.value = ''
}

function removeEditFilename(index: number) {
  editFilenames.value.splice(index, 1)
}

async function saveEdit() {
  saving.value = true
  try {
    await $fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      body: {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        formulaId: editForm.formulaId || null,
        photoFilenames: editFilenames.value
      }
    })
    await refresh()
    editing.value = false
    toast.add({ title: 'Commande mise à jour', color: 'success' })
  } catch {
    toast.add({ title: 'Erreur lors de la sauvegarde', color: 'error' })
  } finally {
    saving.value = false
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
        <template #right>
          <UButton
            v-if="!editing"
            icon="i-lucide-pencil"
            color="neutral"
            variant="outline"
            size="sm"
            @click="startEditing"
          >
            Modifier
          </UButton>
          <template v-else>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              @click="cancelEditing"
            >
              Annuler
            </UButton>
            <UButton
              icon="i-lucide-save"
              color="neutral"
              size="sm"
              :loading="saving"
              @click="saveEdit"
            >
              Enregistrer
            </UButton>
          </template>
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

        <!-- ─── VIEW MODE ─── -->
        <template v-if="!editing">
          <!-- Header card -->
          <div class="border border-default rounded-lg p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <p class="text-xs text-muted mb-1">Client</p>
              <p class="text-sm font-medium">{{ order.firstName }} {{ order.lastName }}</p>
              <p class="text-xs text-muted">{{ order.email }}</p>
            </div>
            <div>
              <p class="text-xs text-muted mb-1">Formule</p>
              <p class="text-sm font-medium">{{ order.formulaName ?? '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-muted mb-1">Photos</p>
              <p class="text-sm font-medium">{{ order.photos.length }}</p>
            </div>
            <div>
              <p class="text-xs text-muted mb-1">Total</p>
              <p class="text-sm font-medium">{{ (order.totalCents / 100).toFixed(2) }} €</p>
            </div>
            <div>
              <p class="text-xs text-muted mb-1">Paiement</p>
              <p class="text-sm font-medium">{{ order.cashPayment ? 'Espèces' : 'En ligne' }}</p>
            </div>
            <div>
              <p class="text-xs text-muted mb-1">Date</p>
              <p class="text-sm">{{ new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }}</p>
            </div>
          </div>

          <!-- Address -->
          <div v-if="order.address" class="border border-default rounded-lg p-5">
            <h2 class="text-sm font-medium mb-3">Adresse postale</h2>
            <div class="text-sm space-y-0.5">
              <p>{{ order.address }}</p>
              <p>{{ order.postalCode }} {{ order.city }}</p>
              <p v-if="order.country" class="text-muted">{{ order.country }}</p>
            </div>
          </div>

          <!-- Status -->
          <div class="border border-default rounded-lg p-5">
            <h2 class="text-sm font-medium mb-4">Statut de la commande</h2>
            <div class="flex items-center gap-3">
              <UBadge :color="STATUS_COLOR[order.status] ?? 'neutral'" variant="subtle" size="md">
                {{ STATUS_LABEL[order.status] ?? order.status }}
              </UBadge>
              <span class="text-muted text-xs">→</span>
              <USelect
                v-model="selectedStatus"
                :items="Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))"
                size="sm" color="neutral" class="w-40"
              />
              <UButton
                size="sm" color="neutral" :loading="updating"
                :disabled="selectedStatus === order.status" @click="updateStatus"
              >
                Appliquer
              </UButton>
            </div>
          </div>

          <!-- Photos -->
          <div class="border border-default rounded-lg p-5">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-sm font-medium">Photos commandées ({{ order.photos.length }})</h2>
              <UBadge
                v-if="order.photos.some((p: OrderPhoto) => !p.linked)"
                color="warning" variant="subtle" size="sm"
              >
                {{ order.photos.filter((p: OrderPhoto) => !p.linked).length }} en attente de liaison
              </UBadge>
            </div>
            <div v-if="order.photos.length" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              <template v-for="photo in order.photos" :key="photo.itemId">
                <a
                  v-if="photo.linked" :href="photo.url" target="_blank"
                  class="relative aspect-4/3 rounded overflow-hidden bg-muted/10 block group" :title="photo.filename"
                >
                  <img :src="photo.url" :alt="photo.filename" class="size-full object-cover transition-all duration-200 group-hover:brightness-75">
                  <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <UIcon name="i-lucide-external-link" class="size-4 text-white" />
                  </div>
                </a>
                <div
                  v-else
                  class="relative aspect-4/3 rounded border-2 border-dashed border-default flex flex-col items-center justify-center gap-1 bg-muted/5"
                  :title="photo.filename"
                >
                  <UIcon name="i-lucide-image-off" class="size-4 text-muted" />
                  <span class="text-[9px] text-muted text-center px-1 leading-tight truncate max-w-full">{{ photo.filename }}</span>
                </div>
              </template>
            </div>
            <p v-else class="text-sm text-muted">Aucune photo associée.</p>
          </div>

          <!-- Amazon link -->
          <div class="border border-default rounded-lg p-5">
            <h2 class="text-sm font-medium mb-3">Lien Amazon</h2>
            <div class="flex items-center gap-2">
              <UInput
                v-model="amazonLinkInput"
                placeholder="https://www.amazon.fr/…"
                color="neutral"
                size="sm"
                class="flex-1"
              />
              <UButton
                icon="i-lucide-save"
                color="neutral"
                size="sm"
                :loading="savingAmazonLink"
                :disabled="amazonLinkInput === (order.amazonLink ?? '')"
                @click="saveAmazonLink"
              />
              <a
                v-if="order.amazonLink"
                :href="order.amazonLink"
                target="_blank"
                class="shrink-0"
              >
                <UButton
                  icon="i-lucide-external-link"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  square
                />
              </a>
            </div>
          </div>

          <!-- Mollie ID -->
          <div v-if="order.molliePaymentId" class="text-xs text-muted">
            Mollie ID : <span class="font-mono">{{ order.molliePaymentId }}</span>
          </div>
        </template>

        <!-- ─── EDIT MODE ─── -->
        <template v-else>
          <!-- Client info -->
          <div class="border border-default rounded-lg p-5 space-y-4">
            <h2 class="text-sm font-medium">Informations client</h2>
            <div class="grid grid-cols-2 gap-3">
              <UFormField label="Prénom">
                <UInput v-model="editForm.firstName" color="neutral" class="w-full" />
              </UFormField>
              <UFormField label="Nom">
                <UInput v-model="editForm.lastName" color="neutral" class="w-full" />
              </UFormField>
            </div>
            <UFormField label="E-mail">
              <UInput v-model="editForm.email" type="email" color="neutral" class="w-full" />
            </UFormField>
          </div>

          <!-- Formula -->
          <div class="border border-default rounded-lg p-5 space-y-4">
            <h2 class="text-sm font-medium">Formule</h2>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="px-3 py-2 rounded-lg border-2 text-left text-sm transition-colors"
                :class="!editForm.formulaId ? 'border-primary bg-primary/5' : 'border-default hover:border-muted'"
                @click="editForm.formulaId = ''"
              >
                <p class="font-medium">Sans formule</p>
                <p class="text-xs text-muted">Prix par photo</p>
              </button>
              <button
                v-for="f in formulas"
                :key="f.id"
                type="button"
                class="px-3 py-2 rounded-lg border-2 text-left text-sm transition-colors"
                :class="editForm.formulaId === f.id ? 'border-primary bg-primary/5' : 'border-default hover:border-muted'"
                @click="editForm.formulaId = f.id"
              >
                <p class="font-medium">{{ f.name }}</p>
                <p class="text-xs text-muted">{{ (f.basePriceCents / 100).toFixed(2) }} € — {{ f.digitalPhotosCount }} photos</p>
              </button>
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
          </div>

          <!-- Photos -->
          <div class="border border-default rounded-lg p-5 space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-medium">Photos</h2>
              <span v-if="maxPhotos !== Infinity" class="text-xs text-muted tabular-nums">
                {{ editFilenames.length }} / {{ maxPhotos }}
              </span>
            </div>

            <form class="flex gap-2" @submit.prevent="addEditFilename">
              <UInput
                v-model="editFilenameInput"
                placeholder="IMG_1234"
                size="sm"
                color="neutral"
                class="flex-1"
                :disabled="!canAddMore"
                @keydown.enter.prevent="addEditFilename"
              />
              <UButton
                type="submit"
                icon="i-lucide-plus"
                color="neutral"
                size="sm"
                :disabled="!editFilenameInput.trim() || !canAddMore"
              >
                Ajouter
              </UButton>
            </form>

            <p v-if="!canAddMore" class="text-xs text-warning">
              Nombre maximum de photos atteint pour cette formule.
            </p>

            <div v-if="editFilenames.length" class="space-y-1 max-h-60 overflow-y-auto">
              <div
                v-for="(name, idx) in editFilenames"
                :key="idx"
                class="flex items-center justify-between px-3 py-2 rounded-lg border border-default text-sm"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <UIcon
                    :name="order.photos.some((p: OrderPhoto) => p.filename === name && p.linked) ? 'i-lucide-image' : 'i-lucide-image-off'"
                    class="size-3.5 shrink-0"
                    :class="order.photos.some((p: OrderPhoto) => p.filename === name && p.linked) ? 'text-success' : 'text-muted'"
                  />
                  <span class="truncate">{{ name }}</span>
                </div>
                <button
                  type="button"
                  class="text-muted hover:text-error shrink-0"
                  @click="removeEditFilename(idx)"
                >
                  <UIcon name="i-lucide-x" class="size-3.5" />
                </button>
              </div>
            </div>

            <!-- Summary -->
            <div class="text-xs text-muted space-y-0.5">
              <p>
                {{ editFilenames.length }} photo{{ editFilenames.length !== 1 ? 's' : '' }}
                <span v-if="editFilenames.length > 0"> — {{ editTotalEuros }} €</span>
              </p>
              <p v-if="selectedFormula && editFilenames.length > selectedFormula.digitalPhotosCount && selectedFormula.extraPhotoPriceCents != null">
                dont {{ editFilenames.length - selectedFormula.digitalPhotosCount }} supplémentaire{{ editFilenames.length - selectedFormula.digitalPhotosCount !== 1 ? 's' : '' }}
                (+{{ (((editFilenames.length - selectedFormula.digitalPhotosCount) * selectedFormula.extraPhotoPriceCents) / 100).toFixed(2) }} €)
              </p>
            </div>
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
