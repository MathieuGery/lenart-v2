<script setup lang="ts">
definePageMeta({ layout: 'public' })

const route = useRoute()
const orderId = route.query.orderId as string | undefined

const { data: order, status } = orderId
  ? await useFetch<PublicOrderDetail>(`/api/public/orders/${orderId}`)
  : { data: ref(null) as Ref<PublicOrderDetail | null>, status: ref('idle') }

const cart = useCart()

// Clear cart once we're on the success page with a valid paid order
watch(() => order.value?.status, (s) => {
  if (s === 'paid') cart.clearCart()
}, { immediate: true })

const businessStatusLabel = computed(() => {
  if (!order.value) return ''
  return order.value.businessStatus === 'completed' ? 'Terminée' : 'En cours de traitement'
})

const businessStatusColor = computed(() => {
  if (!order.value) return 'neutral' as const
  return order.value.businessStatus === 'completed' ? 'success' as const : 'warning' as const
})

const businessStatusIcon = computed(() => {
  if (!order.value) return 'i-lucide-loader'
  return order.value.businessStatus === 'completed' ? 'i-lucide-check-circle' : 'i-lucide-clock'
})
</script>

<template>
  <div class="py-20 sm:py-28">
    <div class="max-w-3xl mx-auto px-6 lg:px-8">
      <!-- Loading -->
      <template v-if="status === 'pending'">
        <div class="animate-pulse space-y-4">
          <div class="h-8 w-1/2 bg-muted/20 rounded" />
          <div class="h-4 w-2/3 bg-muted/20 rounded" />
        </div>
      </template>

      <!-- Not found -->
      <template v-else-if="!order">
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-search-x" class="size-8 text-muted shrink-0" />
          <div>
            <h1 class="text-xl font-light">
              Commande introuvable
            </h1>
            <p class="text-sm text-muted mt-1">
              Cette commande n'existe pas ou le lien est invalide.
            </p>
          </div>
        </div>
        <UButton class="mt-6" color="neutral" to="/concours">
          Retour aux concours
        </UButton>
      </template>

      <template v-else>
        <!-- Paid -->
        <template v-if="order.status === 'paid'">
          <div class="flex items-center gap-3 mb-8">
            <div class="size-10 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-check" class="size-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 class="text-2xl font-light tracking-tight">
                Merci pour votre commande !
              </h1>
              <p class="text-sm text-muted mt-0.5">
                Un e-mail de confirmation a été envoyé à {{ order.email }}.
              </p>
            </div>
          </div>

          <div class="flex items-start gap-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 mb-6">
            <UIcon name="i-lucide-mail-warning" class="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p class="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
              Un e-mail de confirmation vous a été envoyé. <strong>Pensez à vérifier vos spams</strong> si vous ne le trouvez pas dans votre boîte de réception.
            </p>
          </div>

          <!-- Order summary -->
          <div class="rounded-lg border border-default p-5 mb-6 space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-muted">Commande</span>
              <span class="font-mono text-xs">{{ order.id.slice(0, 8).toUpperCase() }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Client</span>
              <span>{{ order.firstName }} {{ order.lastName }}</span>
            </div>
            <div v-if="order.formulaName" class="flex justify-between">
              <span class="text-muted">Formule</span>
              <span>{{ order.formulaName }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Photos</span>
              <span>{{ order.photoCount }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Total</span>
              <span>{{ (order.totalCents / 100).toFixed(2) }} €</span>
            </div>
          </div>

          <!-- Business status -->
          <div class="rounded-lg border border-default p-5 mb-6">
            <div class="flex items-center gap-3">
              <UIcon
                :name="businessStatusIcon" class="size-5 shrink-0"
                :class="order.businessStatus === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'"
              />
              <div>
                <p class="text-sm font-medium">
                  État de la commande : <UBadge :color="businessStatusColor" variant="subtle" size="sm">{{ businessStatusLabel }}</UBadge>
                </p>
                <p class="text-xs text-muted mt-1">
                  <template v-if="order.businessStatus === 'completed'">
                    Votre commande a été traitée. Vous devriez avoir reçu vos photos par e-mail.
                  </template>
                  <template v-else>
                    Votre commande est en cours de préparation. Vous recevrez vos photos par e-mail dès qu'elles seront prêtes.
                  </template>
                </p>
              </div>
            </div>
          </div>

          <!-- Photos grid -->
          <div v-if="order.photos.length > 0" class="mb-8">
            <h2 class="text-sm font-medium text-muted mb-3">
              Vos photos ({{ order.photos.length }})
            </h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div v-for="photo in order.photos" :key="photo.id" class="relative aspect-4/3 rounded-lg overflow-hidden border border-default bg-muted/5">
                <img
                  :src="photo.url" :alt="photo.filename"
                  class="w-full h-full object-cover"
                  loading="lazy"
                >
                <div class="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent px-2 py-1.5">
                  <p class="text-xs text-white truncate">
                    {{ photo.filename }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Contact support -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-lg border border-default p-5">
            <div class="flex-1">
              <p class="text-sm font-medium">
                Une question sur votre commande ?
              </p>
              <p class="text-xs text-muted mt-0.5">
                Notre équipe est disponible pour vous aider.
              </p>
            </div>
            <UButton color="neutral" variant="outline" to="/contact" icon="i-lucide-mail">
              Contacter le support
            </UButton>
          </div>
        </template>

        <!-- Pending -->
        <template v-else-if="order.status === 'pending'">
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-clock" class="size-8 text-muted shrink-0" />
            <div>
              <h1 class="text-xl font-light">
                Paiement en attente
              </h1>
              <p class="text-sm text-muted mt-1">
                Votre paiement est en cours de traitement. Rechargez cette page dans quelques instants.
              </p>
            </div>
          </div>
          <UButton class="mt-6" color="neutral" variant="outline" @click="$router.go(0)">
            Actualiser
          </UButton>
        </template>

        <!-- Other statuses (cancelled, expired, failed) -->
        <template v-else>
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-circle-x" class="size-8 text-muted shrink-0" />
            <div>
              <h1 class="text-xl font-light">
                Paiement non abouti
              </h1>
              <p class="text-sm text-muted mt-1">
                Le paiement a échoué ou a expiré. Votre panier a été conservé.
              </p>
            </div>
          </div>
          <UButton class="mt-6" color="neutral" to="/concours">
            Retour aux concours
          </UButton>
        </template>
      </template>
    </div>
  </div>
</template>
