<script setup lang="ts">
const cart = useCart()

type View = 'cart' | 'checkout' | 'success'
const view = ref<View>('cart')

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  address: '',
  city: '',
  postalCode: '',
  country: 'France',
  paymentMethod: 'online' as 'online' | 'cash'
})
const loading = ref(false)
const error = ref<string | null>(null)
const confirmedOrderId = ref<string | null>(null)
const confirmedFree = ref(false)

// Promo code
const promoInput = ref('')
const promoLoading = ref(false)
const promoError = ref<string | null>(null)
const appliedPromo = ref<{ code: string, type: 'percentage' | 'fixed', value: number } | null>(null)

const discountCents = computed(() => {
  if (!appliedPromo.value) return 0
  const total = cart.totalCents.value
  if (appliedPromo.value.type === 'percentage') {
    return Math.round(total * appliedPromo.value.value / 100)
  }
  return Math.min(appliedPromo.value.value, total)
})

const finalTotalCents = computed(() => Math.max(0, cart.totalCents.value - discountCents.value))

async function validatePromo() {
  promoError.value = null
  const code = promoInput.value.trim()
  if (!code) return
  promoLoading.value = true
  try {
    const result = await $fetch<{ valid: boolean, message?: string, code?: string, type?: string, value?: number }>('/api/public/promo-code/validate', {
      method: 'POST',
      body: { code, formulaId: cart.formula.value?.id }
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

watch(() => cart.isOpen.value, (open) => {
  if (!open) {
    view.value = 'cart'
    error.value = null
    confirmedOrderId.value = null
    confirmedFree.value = false
    removePromo()
  }
})

async function submitOrder() {
  error.value = null
  loading.value = true
  try {
    const result = await $fetch<{ checkoutUrl: string | null, orderId: string, free: boolean }>('/api/public/checkout', {
      method: 'POST',
      body: {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        photoIds: cart.items.value.map(i => i.id),
        formulaId: cart.formula.value?.id,
        paymentMethod: form.paymentMethod,
        promoCode: appliedPromo.value?.code,
        ...(form.paymentMethod === 'online' ? {
          address: form.address,
          city: form.city,
          postalCode: form.postalCode,
          country: form.country
        } : {})
      }
    })

    if (result.free) {
      confirmedOrderId.value = result.orderId
      confirmedFree.value = true
      cart.clearCart()
      view.value = 'success'
    } else if (form.paymentMethod === 'cash') {
      confirmedOrderId.value = result.orderId
      cart.clearCart()
      view.value = 'success'
    } else {
      cart.isOpen.value = false
      window.location.href = result.checkoutUrl!
    }
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } })?.data?.message ?? 'Une erreur est survenue.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="cart.isOpen.value"
        class="fixed inset-0 z-50 flex justify-end"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/40"
          @click="cart.isOpen.value = false"
        />

        <!-- Panel -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="translate-x-full"
          enter-to-class="translate-x-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="translate-x-0"
          leave-to-class="translate-x-full"
        >
          <div
            v-if="cart.isOpen.value"
            class="relative w-full max-w-sm bg-default shadow-xl flex flex-col"
          >
            <!-- Header -->
            <div class="flex items-center justify-between px-5 py-4 border-b border-default">
              <div class="flex items-center gap-2">
                <button
                  v-if="view === 'checkout'"
                  type="button"
                  class="text-muted hover:text-highlighted transition-colors mr-1"
                  @click="view = 'cart'"
                >
                  <UIcon name="i-lucide-arrow-left" class="size-4" />
                </button>
                <h2 class="font-medium text-sm">
                  {{ view === 'cart' ? 'Mon panier' : view === 'checkout' ? 'Finaliser la commande' : 'Commande confirmée' }}
                  <span v-if="view === 'cart'" class="ml-1.5 text-muted font-normal">({{ cart.count.value }})</span>
                </h2>
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="view === 'cart' && cart.count.value > 0"
                  type="button"
                  class="text-xs text-muted hover:text-highlighted transition-colors"
                  @click="cart.clearCart()"
                >
                  Tout vider
                </button>
                <button
                  type="button"
                  class="text-muted hover:text-highlighted transition-colors"
                  @click="cart.isOpen.value = false"
                >
                  <UIcon name="i-lucide-x" class="size-4" />
                </button>
              </div>
            </div>

            <!-- Cart view -->
            <template v-if="view === 'cart'">
              <div class="flex-1 overflow-y-auto">
                <!-- Formule sélectionnée -->
                <div v-if="cart.formula.value" class="border-b border-default bg-elevated/50">
                  <div class="px-5 pt-4 pb-3">
                    <div class="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p class="text-xs uppercase tracking-widest text-muted mb-1">
                          Formule
                        </p>
                        <p class="text-sm font-medium leading-tight">
                          {{ cart.formula.value.name }}
                        </p>
                        <p v-if="cart.formula.value.description" class="text-xs text-muted mt-0.5 leading-snug">
                          {{ cart.formula.value.description }}
                        </p>
                      </div>
                      <span class="text-sm font-semibold shrink-0">
                        {{ (cart.formula.value.basePriceCents / 100).toFixed(2) }} €
                      </span>
                    </div>
                    <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      <span class="flex items-center gap-1">
                        <UIcon name="i-lucide-image" class="size-3" />
                        {{ cart.formula.value.digitalPhotosCount }} photo{{ cart.formula.value.digitalPhotosCount > 1 ? 's' : '' }} incluse{{ cart.formula.value.digitalPhotosCount > 1 ? 's' : '' }}
                      </span>
                      <span
                        v-if="cart.formula.value.extraPhotoPriceCents != null"
                        class="flex items-center gap-1"
                      >
                        <UIcon name="i-lucide-plus" class="size-3" />
                        {{ (cart.formula.value.extraPhotoPriceCents / 100).toFixed(2) }} €/photo supp.
                      </span>
                      <span v-if="cart.formula.value.printDetails" class="flex items-center gap-1">
                        <UIcon name="i-lucide-printer" class="size-3" />
                        {{ cart.formula.value.printDetails }}
                      </span>
                    </div>
                    <!-- Progress bar: photos used vs included -->
                    <div
                      v-if="!cart.formula.value.isTourComplete"
                      class="mt-3"
                    >
                      <div class="flex justify-between text-[10px] text-muted mb-1">
                        <span>{{ cart.count.value }} / {{ cart.formula.value.digitalPhotosCount }} photos</span>
                        <span v-if="cart.count.value > cart.formula.value.digitalPhotosCount" class="text-warning">
                          +{{ cart.count.value - cart.formula.value.digitalPhotosCount }} supplémentaire{{ cart.count.value - cart.formula.value.digitalPhotosCount > 1 ? 's' : '' }}
                        </span>
                      </div>
                      <div class="h-1 rounded-full bg-muted/20 overflow-hidden">
                        <div
                          class="h-full rounded-full bg-primary transition-all duration-300"
                          :style="{ width: `${Math.min(100, (cart.count.value / cart.formula.value.digitalPhotosCount) * 100)}%` }"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <template v-if="cart.items.value.length">
                  <div
                    v-for="item in cart.items.value"
                    :key="item.id"
                    class="flex items-center gap-3 px-5 py-3 border-b border-default last:border-0"
                  >
                    <img
                      :src="item.url"
                      :alt="item.filename"
                      class="size-14 rounded object-cover shrink-0 bg-muted/10"
                    >
                    <div class="flex-1 min-w-0">
                      <p class="text-xs text-muted truncate">
                        {{ item.collectionName }}
                      </p>
                      <p class="text-xs truncate mt-0.5">
                        {{ item.filename }}
                      </p>
                    </div>
                    <button
                      type="button"
                      class="shrink-0 text-muted hover:text-red-500 transition-colors"
                      @click="cart.removeFromCart(item.id)"
                    >
                      <UIcon name="i-lucide-trash-2" class="size-3.5" />
                    </button>
                  </div>
                </template>

                <div v-else class="flex flex-col items-center justify-center h-48 text-center px-6">
                  <UIcon name="i-lucide-shopping-cart" class="size-8 text-muted/30 mb-3" />
                  <p class="text-sm text-muted">
                    Votre panier est vide.
                  </p>
                  <p class="text-xs text-muted/60 mt-1">
                    Sélectionnez des photos pour les ajouter.
                  </p>
                </div>
              </div>

              <div
                v-if="cart.count.value > 0"
                class="p-4 border-t border-default space-y-2"
              >
                <div class="flex justify-between text-sm px-1">
                  <span class="text-muted">Total</span>
                  <span class="font-medium">
                    {{ (cart.totalCents.value / 100).toFixed(2) }} €
                  </span>
                </div>
                <UButton
                  block
                  color="neutral"
                  size="md"
                  trailing-icon="i-lucide-arrow-right"
                  @click="view = 'checkout'"
                >
                  Commander — {{ (cart.totalCents.value / 100).toFixed(2) }} €
                </UButton>
              </div>
            </template>

            <!-- Checkout form view -->
            <template v-else-if="view === 'checkout'">
              <form
                class="flex-1 flex flex-col"
                @submit.prevent="submitOrder"
              >
                <div class="flex-1 px-5 py-5 space-y-4 overflow-y-auto">
                  <!-- Order summary -->
                  <div class="rounded-lg bg-muted/5 border border-default px-4 py-3 text-sm space-y-1.5">
                    <div class="flex justify-between">
                      <span class="text-muted">Photos sélectionnées</span>
                      <span>{{ cart.count.value }}</span>
                    </div>
                    <div v-if="appliedPromo" class="flex justify-between text-green-600 dark:text-green-400">
                      <span>Réduction ({{ appliedPromo.type === 'percentage' ? `${appliedPromo.value}%` : `${(appliedPromo.value / 100).toFixed(2)} €` }})</span>
                      <span>-{{ (discountCents / 100).toFixed(2) }} €</span>
                    </div>
                    <div class="flex justify-between font-medium">
                      <span>Total</span>
                      <span>{{ (finalTotalCents / 100).toFixed(2) }} €</span>
                    </div>
                  </div>

                  <!-- Promo code -->
                  <div class="space-y-1.5">
                    <label class="text-xs font-medium">Code promo</label>
                    <template v-if="appliedPromo">
                      <div class="flex items-center gap-2 px-3 py-2 rounded-md border border-green-500/30 bg-green-500/5 text-sm">
                        <UIcon name="i-lucide-ticket-percent" class="size-3.5 text-green-600 dark:text-green-400 shrink-0" />
                        <span class="flex-1 font-mono text-xs font-medium">{{ appliedPromo.code }}</span>
                        <button type="button" class="text-muted hover:text-highlighted shrink-0" @click="removePromo">
                          <UIcon name="i-lucide-x" class="size-3.5" />
                        </button>
                      </div>
                    </template>
                    <template v-else>
                      <div class="flex gap-2">
                        <input
                          v-model="promoInput"
                          type="text"
                          placeholder="PROMO2025"
                          class="flex-1 rounded-md border border-default bg-default px-3 py-2 text-sm uppercase outline-none focus:ring-2 focus:ring-primary/50"
                          @keydown.enter.prevent="validatePromo"
                        >
                        <button
                          type="button"
                          class="px-3 py-2 rounded-md border border-default text-xs font-medium hover:bg-elevated/40 transition-colors"
                          :disabled="!promoInput.trim() || promoLoading"
                          @click="validatePromo"
                        >
                          {{ promoLoading ? '…' : 'Appliquer' }}
                        </button>
                      </div>
                      <p v-if="promoError" class="text-xs text-red-500">{{ promoError }}</p>
                    </template>
                  </div>

                  <!-- Payment method (hidden for free orders) -->
                  <template v-if="finalTotalCents > 0">
                    <div class="space-y-2">
                      <p class="text-xs font-medium">
                        Mode de paiement
                      </p>
                      <div class="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          class="flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border-2 transition-colors text-sm"
                          :class="form.paymentMethod === 'online' ? 'border-primary bg-primary/5' : 'border-default hover:border-muted'"
                          @click="form.paymentMethod = 'online'"
                        >
                          <UIcon name="i-lucide-credit-card" class="size-4" />
                          <span class="font-medium text-xs">En ligne</span>
                          <span class="text-[10px] text-muted text-center leading-tight">Paiement sécurisé CB</span>
                        </button>
                        <button
                          type="button"
                          class="flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border-2 transition-colors text-sm"
                          :class="form.paymentMethod === 'cash' ? 'border-primary bg-primary/5' : 'border-default hover:border-muted'"
                          @click="form.paymentMethod = 'cash'"
                        >
                          <UIcon name="i-lucide-banknote" class="size-4" />
                          <span class="font-medium text-xs">Espèces</span>
                          <span class="text-[10px] text-muted text-center leading-tight">Paiement au stand</span>
                        </button>
                      </div>
                    </div>
                  </template>
                  <div v-else class="rounded-lg bg-green-500/5 border border-green-500/20 px-4 py-3 text-sm text-center">
                    <UIcon name="i-lucide-gift" class="size-4 text-green-600 dark:text-green-400 inline mr-1" />
                    Commande offerte — aucun paiement requis
                  </div>

                  <div class="pt-1">
                    <UButton
                      type="submit"
                      block
                      color="neutral"
                      size="md"
                      :loading="loading"
                      :trailing-icon="finalTotalCents === 0 ? 'i-lucide-check' : form.paymentMethod === 'cash' ? 'i-lucide-check' : 'i-lucide-credit-card'"
                    >
                      {{ finalTotalCents === 0 ? 'Confirmer la commande' : form.paymentMethod === 'cash' ? 'Confirmer la réservation' : `Payer ${(finalTotalCents / 100).toFixed(2)} € en CB` }}
                    </UButton>
                    <p v-if="finalTotalCents === 0" class="text-center text-xs text-muted/60 mt-2">
                      Offert grâce à votre code promo
                    </p>
                    <p v-else-if="form.paymentMethod === 'online'" class="text-center text-xs text-muted/60 mt-2">
                      Paiement sécurisé
                    </p>
                    <p v-else class="text-center text-xs text-muted/60 mt-2">
                      Réglez en espèces directement au stand
                    </p>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div class="space-y-1.5">
                      <label class="text-xs font-medium">Prénom</label>
                      <input
                        v-model="form.firstName"
                        required
                        type="text"
                        autocomplete="given-name"
                        class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                      >
                    </div>
                    <div class="space-y-1.5">
                      <label class="text-xs font-medium">Nom</label>
                      <input
                        v-model="form.lastName"
                        required
                        type="text"
                        autocomplete="family-name"
                        class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                      >
                    </div>
                  </div>

                  <div class="space-y-1.5">
                    <label class="text-xs font-medium">Adresse e-mail</label>
                    <input
                      v-model="form.email"
                      required
                      type="email"
                      autocomplete="email"
                      class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                    >
                  </div>

                  <!-- Address fields (online only, not for free orders) -->
                  <template v-if="form.paymentMethod === 'online' && finalTotalCents > 0">
                    <div class="space-y-1.5">
                      <label class="text-xs font-medium">Adresse</label>
                      <input
                        v-model="form.address"
                        required
                        type="text"
                        autocomplete="street-address"
                        placeholder="12 rue des Écuries"
                        class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                      >
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                      <div class="space-y-1.5">
                        <label class="text-xs font-medium">Code postal</label>
                        <input
                          v-model="form.postalCode"
                          required
                          type="text"
                          autocomplete="postal-code"
                          placeholder="75001"
                          class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                        >
                      </div>
                      <div class="space-y-1.5">
                        <label class="text-xs font-medium">Ville</label>
                        <input
                          v-model="form.city"
                          required
                          type="text"
                          autocomplete="address-level2"
                          placeholder="Paris"
                          class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                        >
                      </div>
                    </div>
                    <div class="space-y-1.5">
                      <label class="text-xs font-medium">Pays</label>
                      <input
                        v-model="form.country"
                        required
                        type="text"
                        autocomplete="country-name"
                        placeholder="France"
                        class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                      >
                    </div>
                  </template>

                  <p
                    v-if="error"
                    class="text-xs text-red-500"
                  >
                    {{ error }}
                  </p>
                </div>
              </form>
            </template>

            <!-- Success view (cash / free) -->
            <template v-else>
              <div class="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
                <div class="size-14 rounded-full bg-green-500/15 flex items-center justify-center mb-4">
                  <UIcon :name="confirmedFree ? 'i-lucide-gift' : 'i-lucide-check'" class="size-7 text-green-600 dark:text-green-400" />
                </div>
                <h3 class="text-base font-medium mb-1">
                  {{ confirmedFree ? 'Commande confirmée !' : 'Réservation confirmée !' }}
                </h3>
                <p class="text-sm text-muted mb-1">
                  {{ confirmedFree ? 'Votre commande est validée, aucun paiement requis.' : 'Vos photos ont été réservées.' }}
                </p>
                <p v-if="!confirmedFree" class="text-sm text-muted">
                  Rendez-vous au stand pour régler en espèces et récupérer vos photos.
                </p>
                <div class="mt-5 flex items-start gap-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-left">
                  <UIcon name="i-lucide-mail-warning" class="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p class="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                    Un e-mail de confirmation vous a été envoyé. <strong>Pensez à vérifier vos spams</strong> si vous ne le trouvez pas dans votre boîte de réception.
                  </p>
                </div>
                <p v-if="confirmedOrderId" class="mt-4 text-xs text-muted/60 font-mono">
                  Réf. {{ confirmedOrderId.slice(0, 8).toUpperCase() }}
                </p>
              </div>
              <div class="p-4 border-t border-default">
                <UButton
                  block
                  color="neutral"
                  variant="outline"
                  @click="cart.isOpen.value = false"
                >
                  Fermer
                </UButton>
              </div>
            </template>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
