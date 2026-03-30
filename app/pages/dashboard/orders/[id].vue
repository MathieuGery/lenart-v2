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

const BUSINESS_STATUS_LABEL: Record<string, string> = {
  in_progress: 'En cours',
  completed: 'Terminée'
}

const BUSINESS_STATUS_COLOR: Record<string, 'warning' | 'success'> = {
  in_progress: 'warning',
  completed: 'success'
}

// Status update
const updating = ref(false)
const selectedStatus = ref(order.value?.status ?? 'pending')
const updatingBusiness = ref(false)

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

// Send photos ready email
const sendingEmail = ref(false)

const canSendPhotosEmail = computed(() =>
  order.value?.businessStatus === 'completed' && !!order.value?.amazonLink
)

async function sendPhotosEmail() {
  sendingEmail.value = true
  try {
    await $fetch(`/api/orders/${id}/send-photos-email`, { method: 'POST' })
    await refresh()
    toast.add({ title: 'E-mail envoyé au client', color: 'success' })
  } catch (e: unknown) {
    toast.add({ title: (e as { data?: { message?: string } })?.data?.message ?? 'Erreur lors de l\'envoi', color: 'error' })
  } finally {
    sendingEmail.value = false
  }
}

async function toggleBusinessStatus() {
  updatingBusiness.value = true
  try {
    const newStatus = order.value?.businessStatus === 'completed' ? 'in_progress' : 'completed'
    await $fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      body: { businessStatus: newStatus }
    })
    await refresh()
    toast.add({ title: 'Avancement mis à jour' })
  } catch {
    toast.add({ title: 'Erreur lors de la mise à jour', color: 'error' })
  } finally {
    updatingBusiness.value = false
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
interface EditPhotoItem {
  filename: string
  photoId: string | null
  collectionId: string | null
  collectionName: string | null
}
const editPhotoItems = ref<EditPhotoItem[]>([])
const editFilenameInput = ref('')

// Photo search for edit mode
const editSearchResults = ref<{ id: string, filename: string, collectionId: string, collectionName: string }[]>([])
const editShowDropdown = ref(false)
const editSelectedCollectionId = ref<string | undefined>(undefined)
let editSearchTimeout: ReturnType<typeof setTimeout> | null = null

const { data: collectionsData } = await useFetch<CollectionListItem[]>('/api/collections')

const editCollectionOptions = computed(() => [
  'Toutes les collections',
  ...(collectionsData.value ?? []).map(c => c.name)
])

const editSelectedCollectionLabel = ref('Toutes les collections')

watch(editSelectedCollectionLabel, (label) => {
  const c = collectionsData.value?.find(c => c.name === label)
  editSelectedCollectionId.value = c?.id
})

async function editSearchPhotos(query: string) {
  if (query.trim().length < 2) {
    editSearchResults.value = []
    editShowDropdown.value = false
    return
  }
  try {
    const params: Record<string, string> = { q: query.trim() }
    if (editSelectedCollectionId.value) params.collectionId = editSelectedCollectionId.value
    editSearchResults.value = await $fetch('/api/photos/search', { params })
    editShowDropdown.value = true
  } catch {
    editSearchResults.value = []
  }
}

watch(editFilenameInput, (val) => {
  if (editSearchTimeout) clearTimeout(editSearchTimeout)
  if (val.trim().length < 2) {
    editSearchResults.value = []
    editShowDropdown.value = false
    return
  }
  editSearchTimeout = setTimeout(() => editSearchPhotos(val), 300)
})

function editSelectPhoto(result: { id: string, filename: string, collectionId: string, collectionName: string }) {
  if (editPhotoItems.value.some(p => p.photoId === result.id)) return
  if (!canAddMore.value) return
  editPhotoItems.value.push({
    filename: result.filename,
    photoId: result.id,
    collectionId: result.collectionId,
    collectionName: result.collectionName
  })
  editFilenameInput.value = ''
  editSearchResults.value = []
  editShowDropdown.value = false
}

function hideEditDropdown() {
  setTimeout(() => {
    editShowDropdown.value = false
  }, 200)
}

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

const canAddMore = computed(() => editPhotoItems.value.length < maxPhotos.value)

watch(() => editForm.formulaId, () => {
  if (editPhotoItems.value.length > maxPhotos.value) {
    editPhotoItems.value.splice(maxPhotos.value)
  }
})

const editTotalEuros = computed(() => {
  const count = editPhotoItems.value.length
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

// Print photo selection in edit mode
// { type: 'linked', photoId: string } | { type: 'deferred', filename: string } | null
const editPrintSelection = ref<{ type: 'linked', photoId: string } | { type: 'deferred', filename: string } | null>(null)

const editHasPrint = computed(() => !!selectedFormula.value?.printDetails)

function setEditPrintPhoto(item: EditPhotoItem) {
  if (item.photoId) {
    if (editPrintSelection.value?.type === 'linked' && editPrintSelection.value.photoId === item.photoId) {
      editPrintSelection.value = null
    } else {
      editPrintSelection.value = { type: 'linked', photoId: item.photoId }
    }
  } else {
    if (editPrintSelection.value?.type === 'deferred' && editPrintSelection.value.filename === item.filename) {
      editPrintSelection.value = null
    } else {
      editPrintSelection.value = { type: 'deferred', filename: item.filename }
    }
  }
}

function isEditPrintSelected(item: EditPhotoItem) {
  if (!editPrintSelection.value) return false
  if (item.photoId) {
    return editPrintSelection.value.type === 'linked' && editPrintSelection.value.photoId === item.photoId
  }
  return editPrintSelection.value.type === 'deferred' && editPrintSelection.value.filename === item.filename
}

function startEditing() {
  if (!order.value) return
  editForm.firstName = order.value.firstName
  editForm.lastName = order.value.lastName
  editForm.email = order.value.email
  // Find formula ID by name
  const f = formulas.value?.find(f => f.name === order.value!.formulaName)
  editForm.formulaId = f?.id ?? ''
  editPhotoItems.value = order.value.photos
    .filter((p: OrderPhoto) => p.filename)
    .map((p: OrderPhoto) => ({
      filename: p.filename!,
      photoId: p.linked ? p.id : null,
      collectionId: p.collectionId ?? null,
      collectionName: p.collectionName ?? null
    }))
  // Restore print photo selection from order
  const pp = order.value.printPhoto
  if (pp?.linked && pp.id) {
    editPrintSelection.value = { type: 'linked', photoId: pp.id }
  } else if (pp?.filename) {
    editPrintSelection.value = { type: 'deferred', filename: pp.filename }
  } else {
    editPrintSelection.value = null
  }
  editFilenameInput.value = ''
  editSearchResults.value = []
  editShowDropdown.value = false
  editSelectedCollectionId.value = undefined
  editSelectedCollectionLabel.value = 'Toutes les collections'
  editing.value = true
}

function cancelEditing() {
  editing.value = false
}

function addEditFilename() {
  let name = editFilenameInput.value.trim()
  if (!name || !canAddMore.value) return
  if (!/\.\w+$/.test(name)) name += '.jpg'
  if (!editPhotoItems.value.some(p => p.filename === name)) {
    const col = collectionsData.value?.find(c => c.id === editSelectedCollectionId.value)
    editPhotoItems.value.push({
      filename: name,
      photoId: null,
      collectionId: editSelectedCollectionId.value ?? null,
      collectionName: col?.name ?? null
    })
  }
  editFilenameInput.value = ''
  editSearchResults.value = []
  editShowDropdown.value = false
}

function removeEditFilename(index: number) {
  editPhotoItems.value.splice(index, 1)
}

// Convert payment
const convertStep = ref<'idle' | 'link' | 'terminal'>('idle')
const convertLoading = ref(false)
const convertUrl = ref<string | null>(null)
const terminals = ref<Terminal[]>([])
const terminalsLoading = ref(false)
const selectedTerminalId = ref('')

async function fetchTerminals() {
  terminalsLoading.value = true
  try {
    terminals.value = await $fetch<Terminal[]>('/api/orders/terminals')
  } catch {
    toast.add({ title: 'Erreur lors du chargement des terminaux', color: 'error' })
  } finally {
    terminalsLoading.value = false
  }
}

async function convertToLink() {
  convertLoading.value = true
  try {
    const result = await $fetch<{ checkoutUrl: string | null }>(`/api/orders/${id}/convert-payment`, {
      method: 'POST',
      body: { paymentMethod: 'link' }
    })
    convertUrl.value = result.checkoutUrl
    await refresh()
    toast.add({ title: 'Lien de paiement créé', color: 'success' })
  } catch {
    toast.add({ title: 'Erreur lors de la conversion', color: 'error' })
  } finally {
    convertLoading.value = false
  }
}

async function convertToTerminal() {
  if (!selectedTerminalId.value) return
  convertLoading.value = true
  try {
    await $fetch(`/api/orders/${id}/convert-payment`, {
      method: 'POST',
      body: { paymentMethod: 'terminal', terminalId: selectedTerminalId.value }
    })
    await refresh()
    convertStep.value = 'idle'
    selectedTerminalId.value = ''
    toast.add({ title: 'Paiement envoyé au terminal', color: 'success' })
  } catch {
    toast.add({ title: 'Erreur lors de l\'envoi au terminal', color: 'error' })
  } finally {
    convertLoading.value = false
  }
}

async function saveEdit() {
  saving.value = true
  try {
    const linkedIds = editPhotoItems.value.filter(p => p.photoId).map(p => p.photoId!)
    const unlinkedItems = editPhotoItems.value.filter(p => !p.photoId).map(p => ({
      filename: p.filename,
      collectionId: p.collectionId
    }))

    const printBody: Record<string, unknown> = {}
    if (editHasPrint.value) {
      if (editPrintSelection.value?.type === 'linked') {
        printBody.printPhotoId = editPrintSelection.value.photoId
        printBody.printPhotoFilename = null
      } else if (editPrintSelection.value?.type === 'deferred') {
        printBody.printPhotoFilename = editPrintSelection.value.filename
        printBody.printPhotoId = null
      } else {
        printBody.printPhotoId = null
        printBody.printPhotoFilename = null
      }
    }

    await $fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      body: {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        formulaId: editForm.formulaId || null,
        photoIds: linkedIds.length ? linkedIds : undefined,
        photoFilenames: unlinkedItems.length ? unlinkedItems : undefined,
        ...printBody
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

// Comments
const { data: comments, refresh: refreshComments } = await useFetch<OrderComment[]>(`/api/orders/${id}/comments`)
const commentInput = ref('')
const submittingComment = ref(false)
const deletingCommentId = ref<string | null>(null)

async function addComment() {
  const content = commentInput.value.trim()
  if (!content) return
  submittingComment.value = true
  try {
    await $fetch(`/api/orders/${id}/comments`, { method: 'POST', body: { content } })
    commentInput.value = ''
    await refreshComments()
  } catch {
    toast.add({ title: 'Erreur lors de l\'ajout du commentaire', color: 'error' })
  } finally {
    submittingComment.value = false
  }
}

async function deleteComment(commentId: string) {
  deletingCommentId.value = commentId
  try {
    await $fetch(`/api/orders/${id}/comments/${commentId}`, { method: 'DELETE' })
    await refreshComments()
  } catch {
    toast.add({ title: 'Erreur lors de la suppression', color: 'error' })
  } finally {
    deletingCommentId.value = null
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
          <div class="border border-default rounded-lg p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
            <div class="lg:col-span-2">
              <p class="text-xs text-muted mb-1">
                Client
              </p>
              <p class="text-sm font-medium">
                {{ order.firstName }} {{ order.lastName }}
              </p>
              <p class="text-xs text-muted truncate">
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
              <p v-if="order.discountCents > 0" class="text-xs text-green-600 dark:text-green-400">
                -{{ (order.discountCents / 100).toFixed(2) }} € ({{ order.promoCode }})
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
                Origine
              </p>
              <p class="text-sm font-medium">
                {{ order.createdByAdmin === true ? 'Stand' : order.createdByAdmin === false ? 'Client' : '—' }}
              </p>
            </div>
            <div>
              <p class="text-xs text-muted mb-1">
                Date
              </p>
              <p class="text-sm">
                {{ new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
              </p>
            </div>
          </div>

          <!-- Address -->
          <div v-if="order.address" class="border border-default rounded-lg p-5">
            <h2 class="text-sm font-medium mb-3">
              Adresse postale
            </h2>
            <div class="text-sm space-y-0.5">
              <p>{{ order.address }}</p>
              <p>{{ order.postalCode }} {{ order.city }}</p>
              <p v-if="order.country" class="text-muted">
                {{ order.country }}
              </p>
            </div>
          </div>

          <!-- Status -->
          <div class="border border-default rounded-lg p-5">
            <h2 class="text-sm font-medium mb-4">
              Statut de la commande
            </h2>
            <div class="flex items-center gap-3">
              <UBadge :color="STATUS_COLOR[order.status] ?? 'neutral'" variant="subtle" size="md">
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

          <!-- Convert / retry payment -->
          <div
            v-if="(order.cashPayment && order.status === 'pending') || order.status === 'failed' || convertUrl"
            class="border border-default rounded-lg p-5"
          >
            <h2 class="text-sm font-medium mb-1">
              {{ order.status === 'failed' ? 'Relancer le paiement' : 'Convertir le paiement' }}
            </h2>
            <p class="text-xs text-muted mb-4">
              {{ order.status === 'failed'
                ? 'Le paiement a échoué. Générez un nouveau lien ou envoyez directement au TPE.'
                : 'Passez cette commande espèces en paiement en ligne ou via TPE Mollie.' }}
            </p>

            <!-- Idle: choose method -->
            <template v-if="convertStep === 'idle' && !convertUrl">
              <div class="flex flex-wrap gap-2">
                <UButton
                  size="sm"
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-link"
                  @click="convertStep = 'link'"
                >
                  Lien de paiement
                </UButton>
                <UButton
                  size="sm"
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-monitor"
                  @click="convertStep = 'terminal'; fetchTerminals()"
                >
                  Terminal (TPE)
                </UButton>
              </div>
            </template>

            <!-- Link: confirm -->
            <template v-else-if="convertStep === 'link' && !convertUrl">
              <p class="text-sm text-muted mb-4">
                Un lien de paiement Mollie sera créé et pourra être partagé avec le client.
              </p>
              <div class="flex gap-2">
                <UButton
                  size="sm"
                  color="neutral"
                  variant="ghost"
                  @click="convertStep = 'idle'"
                >
                  Annuler
                </UButton>
                <UButton
                  size="sm"
                  color="neutral"
                  icon="i-lucide-link"
                  :loading="convertLoading"
                  @click="convertToLink"
                >
                  Créer le lien
                </UButton>
              </div>
            </template>

            <!-- Link: URL result -->
            <template v-else-if="convertUrl">
              <p class="text-xs text-muted mb-2">
                Lien de paiement créé — partagez-le avec le client :
              </p>
              <div class="flex items-center gap-2">
                <UInput
                  :model-value="convertUrl"
                  readonly
                  size="sm"
                  class="flex-1 font-mono text-xs"
                />
                <UButton
                  size="sm"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-copy"
                  square
                  @click="navigator.clipboard.writeText(convertUrl!); toast.add({ title: 'Copié !', duration: 1500 })"
                />
                <a :href="convertUrl" target="_blank" class="shrink-0">
                  <UButton
                    size="sm"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-external-link"
                    square
                  />
                </a>
              </div>
              <UButton
                class="mt-3"
                size="sm"
                color="neutral"
                variant="ghost"
                @click="convertUrl = null; convertStep = 'idle'"
              >
                Fermer
              </UButton>
            </template>

            <!-- Terminal: select -->
            <template v-else-if="convertStep === 'terminal'">
              <div v-if="terminalsLoading" class="text-sm text-muted py-2">
                Chargement des terminaux…
              </div>
              <template v-else>
                <p v-if="!terminals.length" class="text-sm text-muted mb-3">
                  Aucun terminal disponible.
                </p>
                <div v-else class="space-y-2 mb-4">
                  <button
                    v-for="t in terminals"
                    :key="t.id"
                    type="button"
                    class="w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors"
                    :class="selectedTerminalId === t.id ? 'border-primary bg-primary/5' : 'border-default hover:border-muted'"
                    @click="selectedTerminalId = t.id"
                  >
                    <UIcon name="i-lucide-monitor" class="size-4 text-muted shrink-0" />
                    <div>
                      <p class="text-sm font-medium">
                        {{ t.description || [t.brand, t.model].filter(Boolean).join(' ') || t.id }}
                      </p>
                      <p v-if="t.serialNumber" class="text-xs text-muted">
                        {{ t.serialNumber }}
                      </p>
                    </div>
                    <div
                      v-if="selectedTerminalId === t.id"
                      class="ml-auto size-5 rounded-full bg-primary flex items-center justify-center shrink-0"
                    >
                      <UIcon name="i-lucide-check" class="size-3 text-white" />
                    </div>
                  </button>
                </div>
                <div class="flex gap-2">
                  <UButton
                    size="sm"
                    color="neutral"
                    variant="ghost"
                    @click="convertStep = 'idle'; selectedTerminalId = ''"
                  >
                    Annuler
                  </UButton>
                  <UButton
                    size="sm"
                    color="neutral"
                    icon="i-lucide-send"
                    :loading="convertLoading"
                    :disabled="!selectedTerminalId || !terminals.length"
                    @click="convertToTerminal"
                  >
                    Envoyer au terminal
                  </UButton>
                </div>
              </template>
            </template>
          </div>

          <!-- Business status -->
          <div class="border border-default rounded-lg p-5">
            <h2 class="text-sm font-medium mb-4">
              Avancement
            </h2>
            <p class="text-xs text-muted mb-3">
              Représente l'état d'avancement de la commande côté traitement photo et permet l'envoi de mail quand la commande est terminée
            </p>
            <div class="flex items-center gap-3">
              <UBadge :color="BUSINESS_STATUS_COLOR[order.businessStatus] ?? 'neutral'" variant="subtle" size="md">
                {{ BUSINESS_STATUS_LABEL[order.businessStatus] ?? order.businessStatus }}
              </UBadge>
              <UButton
                size="sm"
                :color="order.businessStatus === 'completed' ? 'warning' : 'success'"
                variant="outline"
                :loading="updatingBusiness"
                :icon="order.businessStatus === 'completed' ? 'i-lucide-rotate-ccw' : 'i-lucide-check'"
                @click="toggleBusinessStatus"
              >
                {{ order.businessStatus === 'completed' ? 'Repasser en cours' : 'Marquer terminée' }}
              </UButton>
            </div>
          </div>

          <!-- Photos -->
          <div class="border border-default rounded-lg p-5">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-sm font-medium">
                Photos commandées ({{ order.photos.length }})
              </h2>
              <UBadge
                v-if="order.photos.some((p: OrderPhoto) => !p.linked)"
                color="warning"
                variant="subtle"
                size="sm"
              >
                {{ order.photos.filter((p: OrderPhoto) => !p.linked).length }} en attente de liaison
              </UBadge>
            </div>
            <div v-if="order.photos.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <div v-for="photo in order.photos" :key="photo.itemId" class="space-y-1.5">
                <a
                  v-if="photo.linked"
                  :href="photo.url"
                  target="_blank"
                  class="relative aspect-4/3 rounded overflow-hidden bg-muted/10 block group"
                  :title="photo.filename"
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
                </div>
                <div class="px-0.5">
                  <p class="text-xs truncate" :title="photo.filename">
                    {{ photo.filename }}
                  </p>
                  <p v-if="photo.collectionName" class="text-[10px] text-muted truncate" :title="photo.collectionName">
                    {{ photo.collectionName }}
                  </p>
                  <p v-else class="text-[10px] text-muted/50 italic">
                    Non liée
                  </p>
                </div>
              </div>
            </div>
            <p v-else class="text-sm text-muted">
              Aucune photo associée.
            </p>
          </div>

          <!-- Print photo -->
          <div v-if="order.printPhoto" class="border border-default rounded-lg p-5">
            <div class="flex items-center gap-1.5 mb-3">
              <UIcon name="i-lucide-printer" class="size-4 text-muted" />
              <h2 class="text-sm font-medium">
                Photo à imprimer
              </h2>
            </div>
            <div class="flex items-center gap-3">
              <a
                v-if="order.printPhoto.linked && order.printPhoto.url"
                :href="order.printPhoto.url"
                target="_blank"
                class="relative size-16 rounded overflow-hidden bg-muted/10 shrink-0 block group"
              >
                <img :src="order.printPhoto.url" :alt="order.printPhoto.filename ?? ''" class="size-full object-cover group-hover:brightness-75 transition-all">
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <UIcon name="i-lucide-external-link" class="size-3.5 text-white" />
                </div>
              </a>
              <div
                v-else
                class="size-16 rounded border-2 border-dashed border-default flex items-center justify-center bg-muted/5 shrink-0"
              >
                <UIcon name="i-lucide-image-off" class="size-4 text-muted" />
              </div>
              <div>
                <p class="text-sm font-medium">
                  {{ order.printPhoto.filename ?? '—' }}
                </p>
                <p class="text-xs text-muted mt-0.5">
                  {{ order.printPhoto.linked ? 'Photo liée' : 'Liaison en attente' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Amazon link -->
          <div class="border border-default rounded-lg p-5">
            <h2 class="text-sm font-medium mb-3">
              Lien Amazon
            </h2>
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

            <!-- Send photos email button -->
            <div class="mt-4 flex items-center gap-3">
              <UButton
                icon="i-lucide-send"
                color="neutral"
                size="sm"
                :loading="sendingEmail"
                :disabled="!canSendPhotosEmail"
                @click="sendPhotosEmail"
              >
                {{ order.photosEmailSentAt ? 'Renvoyer l\'e-mail' : 'Envoyer l\'e-mail de téléchargement' }}
              </UButton>
              <div v-if="order.photosEmailSentAt" class="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                <UIcon name="i-lucide-check-circle" class="size-3.5" />
                Envoyé le {{ new Date(order.photosEmailSentAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
              </div>
              <p v-else-if="!order.amazonLink" class="text-xs text-muted">
                Ajoutez un lien pour activer l'envoi.
              </p>
              <p v-else-if="order.businessStatus !== 'completed'" class="text-xs text-muted">
                La commande doit être marquée comme terminée.
              </p>
            </div>
          </div>

          <!-- Mollie ID -->
          <div v-if="order.molliePaymentId" class="text-xs text-muted">
            Mollie ID : <span class="font-mono">{{ order.molliePaymentId }}</span>
          </div>

          <!-- Comments -->
          <div class="border border-default rounded-lg p-5 space-y-4">
            <h2 class="text-sm font-medium">
              Commentaires internes
            </h2>

            <!-- List -->
            <div v-if="comments?.length" class="space-y-3">
              <div
                v-for="c in comments"
                :key="c.id"
                class="group flex items-start gap-3"
              >
                <div class="flex-1 rounded-lg bg-elevated/50 border border-default px-3 py-2.5">
                  <p class="text-sm whitespace-pre-wrap">
                    {{ c.content }}
                  </p>
                  <p class="text-[10px] text-muted mt-1.5">
                    {{ new Date(c.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
                  </p>
                </div>
                <button
                  type="button"
                  class="mt-1 text-muted hover:text-error transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                  :disabled="deletingCommentId === c.id"
                  @click="deleteComment(c.id)"
                >
                  <UIcon
                    :name="deletingCommentId === c.id ? 'i-lucide-loader-circle' : 'i-lucide-trash-2'"
                    class="size-3.5"
                    :class="{ 'animate-spin': deletingCommentId === c.id }"
                  />
                </button>
              </div>
            </div>
            <p v-else class="text-xs text-muted">
              Aucun commentaire pour le moment.
            </p>

            <!-- Input -->
            <form class="flex gap-2" @submit.prevent="addComment">
              <UTextarea
                v-model="commentInput"
                placeholder="Ajouter un commentaire…"
                size="sm"
                color="neutral"
                :rows="2"
                autoresize
                class="flex-1"
              />
              <UButton
                type="submit"
                icon="i-lucide-send"
                color="neutral"
                size="sm"
                :loading="submittingComment"
                :disabled="!commentInput.trim()"
                square
              />
            </form>
          </div>
        </template>

        <!-- ─── EDIT MODE ─── -->
        <template v-else>
          <!-- Client info -->
          <div class="border border-default rounded-lg p-5 space-y-4">
            <h2 class="text-sm font-medium">
              Informations client
            </h2>
            <div class="grid grid-cols-2 gap-3">
              <UFormField label="Prénom">
                <UInput v-model="editForm.firstName" color="neutral" class="w-full" />
              </UFormField>
              <UFormField label="Nom">
                <UInput v-model="editForm.lastName" color="neutral" class="w-full" />
              </UFormField>
            </div>
            <UFormField label="E-mail">
              <UInput
                v-model="editForm.email"
                type="email"
                color="neutral"
                class="w-full"
              />
            </UFormField>
          </div>

          <!-- Formula -->
          <div class="border border-default rounded-lg p-5 space-y-4">
            <h2 class="text-sm font-medium">
              Formule
            </h2>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="px-3 py-2 rounded-lg border-2 text-left text-sm transition-colors"
                :class="!editForm.formulaId ? 'border-primary bg-primary/5' : 'border-default hover:border-muted'"
                @click="editForm.formulaId = ''"
              >
                <p class="font-medium">
                  Sans formule
                </p>
                <p class="text-xs text-muted">
                  Prix par photo
                </p>
              </button>
              <button
                v-for="f in formulas"
                :key="f.id"
                type="button"
                class="px-3 py-2 rounded-lg border-2 text-left text-sm transition-colors"
                :class="editForm.formulaId === f.id ? 'border-primary bg-primary/5' : 'border-default hover:border-muted'"
                @click="editForm.formulaId = f.id"
              >
                <p class="font-medium">
                  {{ f.name }}
                </p>
                <p class="text-xs text-muted">
                  {{ (f.basePriceCents / 100).toFixed(2) }} € — {{ f.digitalPhotosCount }} photos
                </p>
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
              <h2 class="text-sm font-medium">
                Photos
              </h2>
              <span v-if="maxPhotos !== Infinity" class="text-xs text-muted tabular-nums">
                {{ editPhotoItems.length }} / {{ maxPhotos }}
              </span>
            </div>

            <!-- Collection filter -->
            <USelect
              v-model="editSelectedCollectionLabel"
              :items="editCollectionOptions"
              size="sm"
              color="neutral"
              class="w-full"
            />

            <!-- Search input -->
            <div class="relative">
              <form class="flex gap-2" @submit.prevent="addEditFilename">
                <UInput
                  v-model="editFilenameInput"
                  placeholder="Rechercher ou saisir un nom de photo…"
                  size="sm"
                  color="neutral"
                  class="flex-1"
                  :disabled="!canAddMore"
                  @focus="editFilenameInput.trim().length >= 2 && (editShowDropdown = true)"
                  @blur="hideEditDropdown"
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

              <!-- Search dropdown -->
              <div
                v-if="editShowDropdown && editSearchResults.length"
                class="absolute left-0 right-12 top-full mt-1 z-50 border border-default rounded-lg bg-default shadow-lg max-h-48 overflow-y-auto"
              >
                <button
                  v-for="result in editSearchResults"
                  :key="result.id"
                  type="button"
                  class="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-elevated/50 transition-colors"
                  :class="{ 'opacity-40 cursor-not-allowed': editPhotoItems.some(p => p.photoId === result.id) }"
                  :disabled="editPhotoItems.some(p => p.photoId === result.id)"
                  @mousedown.prevent="editSelectPhoto(result)"
                >
                  <UIcon name="i-lucide-image" class="size-3.5 text-success shrink-0" />
                  <div class="min-w-0 flex-1">
                    <p class="truncate">
                      {{ result.filename }}
                    </p>
                    <p class="text-[10px] text-muted truncate">
                      {{ result.collectionName }}
                    </p>
                  </div>
                  <UIcon v-if="editPhotoItems.some(p => p.photoId === result.id)" name="i-lucide-check" class="size-3.5 text-success shrink-0" />
                </button>
              </div>
            </div>

            <p v-if="!canAddMore" class="text-xs text-warning">
              Nombre maximum de photos atteint pour cette formule.
            </p>
            <p v-else class="text-xs text-muted">
              Sélectionnez une photo existante ou tapez un nom pour une liaison différée.
            </p>

            <!-- Photo list -->
            <div v-if="editPhotoItems.length" class="space-y-1 max-h-60 overflow-y-auto">
              <div
                v-for="(item, idx) in editPhotoItems"
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
                  @click="removeEditFilename(idx)"
                >
                  <UIcon name="i-lucide-x" class="size-3.5" />
                </button>
              </div>
            </div>

            <!-- Summary -->
            <div class="text-xs text-muted space-y-0.5">
              <p>
                {{ editPhotoItems.length }} photo{{ editPhotoItems.length !== 1 ? 's' : '' }}
                <span v-if="editPhotoItems.length > 0"> — {{ editTotalEuros }} €</span>
              </p>
              <p v-if="selectedFormula && editPhotoItems.length > selectedFormula.digitalPhotosCount && selectedFormula.extraPhotoPriceCents != null">
                dont {{ editPhotoItems.length - selectedFormula.digitalPhotosCount }} supplémentaire{{ editPhotoItems.length - selectedFormula.digitalPhotosCount !== 1 ? 's' : '' }}
                (+{{ (((editPhotoItems.length - selectedFormula.digitalPhotosCount) * selectedFormula.extraPhotoPriceCents) / 100).toFixed(2) }} €)
              </p>
            </div>
          </div>

          <!-- Print photo picker -->
          <div v-if="editHasPrint && editPhotoItems.length > 0" class="border border-default rounded-lg p-5 space-y-3">
            <div class="flex items-center gap-1.5">
              <UIcon name="i-lucide-printer" class="size-4 text-muted" />
              <h2 class="text-sm font-medium">
                Photo à imprimer
                <span class="text-xs font-normal text-muted ml-1">({{ selectedFormula?.printDetails }})</span>
              </h2>
            </div>
            <p class="text-xs text-muted">
              Sélectionnez la photo qui sera imprimée physiquement.
            </p>
            <div class="space-y-1.5 max-h-60 overflow-y-auto">
              <button
                v-for="(item, idx) in editPhotoItems"
                :key="idx"
                type="button"
                class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border-2 text-left transition-colors text-sm"
                :class="isEditPrintSelected(item)
                  ? 'border-primary bg-primary/5'
                  : 'border-default hover:border-muted'"
                @click="setEditPrintPhoto(item)"
              >
                <UIcon
                  :name="item.photoId ? 'i-lucide-image' : 'i-lucide-image-off'"
                  class="size-3.5 shrink-0"
                  :class="item.photoId ? 'text-success' : 'text-muted'"
                />
                <span class="flex-1 truncate text-xs">{{ item.filename }}</span>
                <div
                  v-if="isEditPrintSelected(item)"
                  class="size-5 rounded-full bg-primary flex items-center justify-center shrink-0"
                >
                  <UIcon name="i-lucide-printer" class="size-2.5 text-white" />
                </div>
              </button>
            </div>
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
