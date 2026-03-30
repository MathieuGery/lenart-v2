<script setup lang="ts">
const toast = useToast()

// ── Filters ──────────────────────────────────────────────────────────────────
type FilterStatus = 'all' | 'in_progress' | 'paid'
const filterStatus = ref<FilterStatus>('in_progress')

const FILTER_LABEL: Record<FilterStatus, string> = {
  all: 'Toutes',
  in_progress: 'En cours',
  paid: 'Payées'
}

// ── Orders list ───────────────────────────────────────────────────────────────
const { data: allOrders, refresh: refreshList } = await useFetch<OrderListItem[]>('/api/orders')

const orders = computed(() => {
  const list = allOrders.value ?? []
  if (filterStatus.value === 'all') return list
  if (filterStatus.value === 'in_progress') return list.filter(o => o.businessStatus === 'in_progress' && o.status === 'paid')
  if (filterStatus.value === 'paid') return list.filter(o => o.status === 'paid')
  return list
})

// ── Current index ─────────────────────────────────────────────────────────────
const currentIndex = ref(0)

watch(orders, () => {
  if (currentIndex.value >= orders.value.length) {
    currentIndex.value = Math.max(0, orders.value.length - 1)
  }
})

const currentOrderId = computed(() => orders.value[currentIndex.value]?.id ?? null)

function prev() {
  if (currentIndex.value > 0) currentIndex.value--
}
function next() {
  if (currentIndex.value < orders.value.length - 1) currentIndex.value++
}

// Keyboard navigation
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') prev()
  if (e.key === 'ArrowRight') next()
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

// ── Order detail ──────────────────────────────────────────────────────────────
const { data: order, refresh: refreshOrder, status: orderStatus } = await useFetch<OrderDetail>(
  () => currentOrderId.value ? `/api/orders/${currentOrderId.value}` : null,
  { watch: [currentOrderId] }
)

// ── Status labels ─────────────────────────────────────────────────────────────
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

// ── Business status toggle ────────────────────────────────────────────────────
const updatingBusiness = ref(false)

async function toggleBusinessStatus() {
  if (!order.value) return
  updatingBusiness.value = true
  try {
    const newStatus = order.value.businessStatus === 'completed' ? 'in_progress' : 'completed'
    await $fetch(`/api/orders/${order.value.id}`, {
      method: 'PATCH',
      body: { businessStatus: newStatus }
    })
    await Promise.all([refreshOrder(), refreshList()])
    toast.add({ title: 'Avancement mis à jour' })
  } catch {
    toast.add({ title: 'Erreur lors de la mise à jour', color: 'error' })
  } finally {
    updatingBusiness.value = false
  }
}

// ── Comments ──────────────────────────────────────────────────────────────────
const { data: comments, refresh: refreshComments } = await useFetch<OrderComment[]>(
  () => currentOrderId.value ? `/api/orders/${currentOrderId.value}/comments` : null,
  { watch: [currentOrderId] }
)

const commentInput = ref('')
const submittingComment = ref(false)

async function addComment() {
  const content = commentInput.value.trim()
  if (!content || !order.value) return
  submittingComment.value = true
  try {
    await $fetch(`/api/orders/${order.value.id}/comments`, { method: 'POST', body: { content } })
    commentInput.value = ''
    await refreshComments()
  } catch {
    toast.add({ title: 'Erreur lors de l\'ajout du commentaire', color: 'error' })
  } finally {
    submittingComment.value = false
  }
}

// ── Amazon link ───────────────────────────────────────────────────────────────
const amazonLinkInput = ref('')
const savingAmazonLink = ref(false)

watch(() => order.value?.amazonLink, (v) => {
  amazonLinkInput.value = v ?? ''
}, { immediate: true })

async function saveAmazonLink() {
  if (!order.value) return
  savingAmazonLink.value = true
  try {
    await $fetch(`/api/orders/${order.value.id}`, {
      method: 'PATCH',
      body: { amazonLink: amazonLinkInput.value || null }
    })
    await refreshOrder()
    toast.add({ title: 'Lien mis à jour', color: 'success' })
  } catch {
    toast.add({ title: 'Lien invalide', color: 'error' })
  } finally {
    savingAmazonLink.value = false
  }
}

// ── Send photos email ─────────────────────────────────────────────────────────
const sendingEmail = ref(false)

const canSendPhotosEmail = computed(() =>
  order.value?.businessStatus === 'completed' && !!order.value?.amazonLink
)

async function sendPhotosEmail() {
  if (!order.value) return
  sendingEmail.value = true
  try {
    await $fetch(`/api/orders/${order.value.id}/send-photos-email`, { method: 'POST' })
    await refreshOrder()
    toast.add({ title: 'E-mail envoyé au client', color: 'success' })
  } catch (e: unknown) {
    toast.add({ title: (e as { data?: { message?: string } })?.data?.message ?? 'Erreur lors de l\'envoi', color: 'error' })
  } finally {
    sendingEmail.value = false
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Défilement commandes">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <!-- Filter tabs -->
          <div class="flex items-center gap-1 rounded-lg border border-default p-0.5">
            <button
              v-for="(label, key) in FILTER_LABEL"
              :key="key"
              type="button"
              class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              :class="filterStatus === key
                ? 'bg-elevated text-highlighted shadow-sm'
                : 'text-muted hover:text-highlighted'"
              @click="filterStatus = key; currentIndex = 0"
            >
              {{ label }}
            </button>
          </div>
          <!-- Navigation counter + arrows -->
          <div class="flex items-center gap-1">
            <UButton
              icon="i-lucide-chevron-left"
              color="neutral"
              variant="ghost"
              size="sm"
              square
              :disabled="currentIndex === 0 || !orders.length"
              @click="prev"
            />
            <span class="text-xs text-muted tabular-nums min-w-14 text-center">
              {{ orders.length ? `${currentIndex + 1} / ${orders.length}` : '0' }}
            </span>
            <UButton
              icon="i-lucide-chevron-right"
              color="neutral"
              variant="ghost"
              size="sm"
              square
              :disabled="currentIndex >= orders.length - 1 || !orders.length"
              @click="next"
            />
          </div>
          <UButton
            :to="`/dashboard/orders/${currentOrderId}`"
            icon="i-lucide-external-link"
            color="neutral"
            variant="outline"
            size="sm"
            :disabled="!currentOrderId"
          >
            Détail
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Empty state -->
      <div v-if="!orders.length" class="flex flex-col items-center justify-center h-full py-24 text-center">
        <UIcon name="i-lucide-inbox" class="size-10 text-muted mb-4" />
        <p class="text-sm text-muted">Aucune commande dans ce filtre.</p>
      </div>

      <!-- Loading -->
      <div v-else-if="orderStatus === 'pending'" class="flex items-center justify-center h-full py-24">
        <UIcon name="i-lucide-loader-circle" class="size-6 text-muted animate-spin" />
      </div>

      <div v-else-if="order" class="p-6 max-w-4xl space-y-5">

        <!-- ── Info card ── -->
        <div class="border border-default rounded-lg p-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-0.5">
                <span class="font-mono text-xs text-muted">#{{ order.id.slice(0, 8).toUpperCase() }}</span>
                <UBadge :color="STATUS_COLOR[order.status] ?? 'neutral'" variant="subtle" size="sm">
                  {{ STATUS_LABEL[order.status] ?? order.status }}
                </UBadge>
                <UBadge :color="BUSINESS_STATUS_COLOR[order.businessStatus] ?? 'neutral'" variant="subtle" size="sm">
                  {{ BUSINESS_STATUS_LABEL[order.businessStatus] ?? order.businessStatus }}
                </UBadge>
              </div>
              <h2 class="text-lg font-semibold">
                {{ order.firstName }} {{ order.lastName }}
              </h2>
              <p class="text-sm text-muted">{{ order.email }}</p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-xl font-bold tabular-nums">{{ (order.totalCents / 100).toFixed(2) }} €</p>
              <p v-if="order.discountCents > 0" class="text-xs text-green-600 dark:text-green-400">
                -{{ (order.discountCents / 100).toFixed(2) }} € ({{ order.promoCode }})
              </p>
              <p class="text-xs text-muted mt-0.5">
                {{ order.cashPayment ? 'Espèces' : 'En ligne' }}
                · {{ order.createdByAdmin ? 'Stand' : 'Client' }}
              </p>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-default">
            <div>
              <p class="text-[10px] uppercase tracking-wider text-muted mb-0.5">Formule</p>
              <p class="text-sm font-medium">{{ order.formulaName ?? '—' }}</p>
            </div>
            <div>
              <p class="text-[10px] uppercase tracking-wider text-muted mb-0.5">Photos</p>
              <p class="text-sm font-medium">{{ order.photos.length }}</p>
            </div>
            <div>
              <p class="text-[10px] uppercase tracking-wider text-muted mb-0.5">Date</p>
              <p class="text-sm">
                {{ new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
              </p>
            </div>
            <div v-if="order.address">
              <p class="text-[10px] uppercase tracking-wider text-muted mb-0.5">Adresse</p>
              <p class="text-sm">{{ order.postalCode }} {{ order.city }}</p>
            </div>
          </div>
        </div>

        <!-- ── Photos ── -->
        <div class="border border-default rounded-lg p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium">
              Photos commandées ({{ order.photos.length }})
            </h3>
            <UBadge
              v-if="order.photos.some((p: OrderPhoto) => !p.linked)"
              color="warning"
              variant="subtle"
              size="sm"
            >
              {{ order.photos.filter((p: OrderPhoto) => !p.linked).length }} en attente de liaison
            </UBadge>
          </div>
          <div v-if="order.photos.length" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            <div v-for="photo in order.photos" :key="photo.itemId" class="space-y-1">
              <a
                v-if="photo.linked && photo.url"
                :href="photo.url"
                target="_blank"
                class="relative aspect-4/3 rounded overflow-hidden bg-muted/10 block group"
                :title="photo.filename ?? ''"
              >
                <img :src="photo.url" :alt="photo.filename ?? ''" class="size-full object-cover transition-all duration-200 group-hover:brightness-75">
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <UIcon name="i-lucide-external-link" class="size-3 text-white" />
                </div>
              </a>
              <div
                v-else
                class="relative aspect-4/3 rounded border-2 border-dashed border-default flex items-center justify-center bg-muted/5"
                :title="photo.filename ?? ''"
              >
                <UIcon name="i-lucide-image-off" class="size-3.5 text-muted" />
              </div>
              <p class="text-[10px] truncate text-muted" :title="photo.filename ?? ''">
                {{ photo.filename }}
              </p>
            </div>
          </div>
          <p v-else class="text-sm text-muted">Aucune photo associée.</p>
        </div>

        <!-- ── Photo à imprimer ── -->
        <div v-if="order.printPhoto" class="border border-default rounded-lg p-5">
          <div class="flex items-center gap-1.5 mb-3">
            <UIcon name="i-lucide-printer" class="size-4 text-muted" />
            <h3 class="text-sm font-medium">Photo à imprimer</h3>
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
              <p class="text-sm font-medium">{{ order.printPhoto.filename ?? '—' }}</p>
              <p class="text-xs text-muted mt-0.5">
                {{ order.printPhoto.linked ? 'Photo liée' : 'Liaison en attente' }}
              </p>
            </div>
          </div>
        </div>

        <!-- ── Avancement + Amazon + Email ── -->
        <div class="border border-default rounded-lg p-5 space-y-4">
          <h3 class="text-sm font-medium">Traitement</h3>

          <!-- Business status -->
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

          <!-- Amazon link -->
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
            <a v-if="order.amazonLink" :href="order.amazonLink" target="_blank" class="shrink-0">
              <UButton icon="i-lucide-external-link" color="neutral" variant="ghost" size="sm" square />
            </a>
          </div>

          <!-- Send email -->
          <div class="flex items-center gap-3">
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
            <p v-else-if="!order.amazonLink" class="text-xs text-muted">Ajoutez un lien pour activer l'envoi.</p>
            <p v-else-if="order.businessStatus !== 'completed'" class="text-xs text-muted">Marquez la commande comme terminée.</p>
          </div>
        </div>

        <!-- ── Comments ── -->
        <div class="border border-default rounded-lg p-5 space-y-3">
          <h3 class="text-sm font-medium">Commentaires internes</h3>

          <div v-if="comments?.length" class="space-y-2">
            <div
              v-for="c in comments"
              :key="c.id"
              class="rounded-lg bg-elevated/50 border border-default px-3 py-2.5"
            >
              <p class="text-sm whitespace-pre-wrap">{{ c.content }}</p>
              <p class="text-[10px] text-muted mt-1">
                {{ new Date(c.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
              </p>
            </div>
          </div>
          <p v-else class="text-xs text-muted">Aucun commentaire.</p>

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

        <!-- ── Nav footer ── -->
        <div class="flex items-center justify-between pt-2">
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="outline"
            size="sm"
            :disabled="currentIndex === 0"
            @click="prev"
          >
            Précédent
          </UButton>
          <span class="text-xs text-muted tabular-nums">
            {{ currentIndex + 1 }} / {{ orders.length }}
          </span>
          <UButton
            trailing-icon="i-lucide-arrow-right"
            color="neutral"
            variant="outline"
            size="sm"
            :disabled="currentIndex >= orders.length - 1"
            @click="next"
          >
            Suivant
          </UButton>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
