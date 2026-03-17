<script setup lang="ts">
definePageMeta({ layout: 'public' })

interface OrderDetail {
  id: string
  status: string
  email: string
  firstName: string
  lastName: string
  totalCents: number
  photoCount: number
  photos: { id: string, filename: string, url: string }[]
  createdAt: string
}

const route = useRoute()
const orderId = route.query.orderId as string | undefined

const { data: _orderData, status } = await useFetch(
  orderId ? `/api/public/orders/${orderId}` : null,
  { default: () => null }
)
const order = _orderData as unknown as Ref<OrderDetail | null>

const cart = useCart()

// Clear cart once we're on the success page with a valid paid or cash order
watch(() => order.value?.status, (s) => {
  if (s === 'paid' || s === 'cash') cart.clearCart()
}, { immediate: true })
</script>

<template>
  <div class="py-20 sm:py-28">
    <div class="max-w-2xl mx-auto px-6 lg:px-8">
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

          <div class="rounded-lg border border-default p-5 mb-8 space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-muted">Commande</span>
              <span class="font-mono text-xs">{{ order.id.slice(0, 8).toUpperCase() }}</span>
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

          <!-- Download links -->
          <h2 class="text-sm font-medium mb-4">
            Télécharger vos photos
          </h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <a
              v-for="photo in order.photos"
              :key="photo.id"
              :href="photo.url"
              :download="photo.filename"
              class="group relative aspect-4/3 overflow-hidden rounded bg-muted/10 block"
            >
              <img
                :src="photo.url"
                :alt="photo.filename"
                class="size-full object-cover transition-all duration-200 group-hover:brightness-75"
              >
              <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <UIcon name="i-lucide-download" class="size-6 text-white" />
              </div>
            </a>
          </div>

          <p class="mt-6 text-xs text-muted">
            Les liens de téléchargement sont valables 24 heures.
          </p>
        </template>

        <!-- Cash -->
        <template v-else-if="order.status === 'cash'">
          <div class="flex items-center gap-3 mb-6">
            <div class="size-10 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-banknote" class="size-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 class="text-2xl font-light tracking-tight">
                Réservation confirmée !
              </h1>
              <p class="text-sm text-muted mt-0.5">
                Rendez-vous au stand pour régler en espèces.
              </p>
            </div>
          </div>
          <div class="rounded-lg border border-default p-5 space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-muted">Commande</span>
              <span class="font-mono text-xs">{{ order.id.slice(0, 8).toUpperCase() }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Photos</span>
              <span>{{ order.photoCount }}</span>
            </div>
            <div class="flex justify-between font-medium">
              <span>Total à régler</span>
              <span>{{ (order.totalCents / 100).toFixed(2) }} €</span>
            </div>
          </div>
          <UButton class="mt-6" color="neutral" to="/concours">
            Retour aux concours
          </UButton>
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
