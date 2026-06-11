<script setup lang="ts">
definePageMeta({ layout: 'public' })

const cart = useCart()
const router = useRouter()

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
const confirmed = ref(false)

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

const needsPrintSelection = computed(() =>
  !!(cart.formula.value?.printDetails && cart.items.value.length > 0 && !cart.printPhotoId.value)
)

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
        printPhotoId: cart.printPhotoId.value ?? undefined,
        ...(form.paymentMethod === 'online'
          ? {
              address: form.address,
              city: form.city,
              postalCode: form.postalCode,
              country: form.country
            }
          : {})
      }
    })

    if (result.free) {
      confirmedOrderId.value = result.orderId
      confirmedFree.value = true
      cart.clearCart()
      confirmed.value = true
    } else if (form.paymentMethod === 'cash') {
      confirmedOrderId.value = result.orderId
      cart.clearCart()
      confirmed.value = true
    } else {
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
  <div class="py-12 sm:py-16">
    <div class="max-w-4xl mx-auto px-6 lg:px-8">
      <!-- Success state (cash / free) -->
      <template v-if="confirmed">
        <div class="max-w-lg mx-auto text-center py-10">
          <div class="size-14 rounded-full bg-green-500/15 flex items-center justify-center mb-4 mx-auto">
            <UIcon :name="confirmedFree ? 'i-lucide-gift' : 'i-lucide-check'" class="size-7 text-green-600 dark:text-green-400" />
          </div>
          <h1 class="text-2xl font-light tracking-tight mb-1">
            {{ confirmedFree ? 'Commande confirmée !' : 'Réservation confirmée !' }}
          </h1>
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
          <UButton
            class="mt-6"
            color="neutral"
            variant="outline"
            to="/concours"
          >
            Retour aux concours
          </UButton>
        </div>
      </template>

      <!-- Empty cart -->
      <template v-else-if="cart.count.value === 0">
        <div class="flex flex-col items-center justify-center text-center py-20">
          <UIcon name="i-lucide-shopping-cart" class="size-10 text-muted/30 mb-4" />
          <h1 class="text-xl font-light tracking-tight mb-1">
            Votre panier est vide
          </h1>
          <p class="text-sm text-muted mb-6">
            Sélectionnez des photos pour passer commande.
          </p>
          <UButton color="neutral" to="/concours">
            Voir les concours
          </UButton>
        </div>
      </template>

      <!-- Checkout form -->
      <template v-else>
        <div class="flex items-center gap-3 mb-8">
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
            square
            @click="router.back()"
          />
          <h1 class="text-2xl font-light tracking-tight">
            Finaliser la commande
          </h1>
        </div>

        <form
          class="grid lg:grid-cols-5 gap-8"
          @submit.prevent="submitOrder"
        >
          <!-- Left: form fields -->
          <div class="lg:col-span-3 space-y-6">
            <!-- Customer info -->
            <div class="space-y-4">
              <h2 class="text-sm font-medium">
                Vos coordonnées
              </h2>
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
            </div>

            <!-- Payment method (hidden for free orders) -->
            <template v-if="finalTotalCents > 0">
              <div class="space-y-2">
                <h2 class="text-sm font-medium">
                  Mode de paiement
                </h2>
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

            <!-- Address fields (online only, not for free orders) -->
            <template v-if="form.paymentMethod === 'online' && finalTotalCents > 0">
              <div class="space-y-4">
                <h2 class="text-sm font-medium">
                  Adresse de facturation
                </h2>
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
              </div>
            </template>

            <p
              v-if="error"
              class="text-sm text-red-500"
            >
              {{ error }}
            </p>
          </div>

          <!-- Right: order summary -->
          <div class="lg:col-span-2">
            <div class="rounded-lg border border-default p-5 space-y-4 lg:sticky lg:top-20">
              <h2 class="text-sm font-medium">
                Récapitulatif
              </h2>

              <!-- Formula -->
              <div v-if="cart.formula.value" class="text-sm space-y-1">
                <div class="flex justify-between">
                  <span class="text-muted">{{ cart.formula.value.name }}</span>
                  <span>{{ (cart.formula.value.basePriceCents / 100).toFixed(2) }} €</span>
                </div>
              </div>

              <!-- Photos thumbnails -->
              <div class="flex flex-wrap gap-1.5">
                <img
                  v-for="item in cart.items.value"
                  :key="item.id"
                  :src="item.url"
                  :alt="item.filename"
                  class="size-10 rounded object-cover bg-muted/10"
                >
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
                  <p v-if="promoError" class="text-xs text-red-500">
                    {{ promoError }}
                  </p>
                </template>
              </div>

              <!-- Totals -->
              <div class="border-t border-default pt-3 text-sm space-y-1.5">
                <div class="flex justify-between">
                  <span class="text-muted">Photos sélectionnées</span>
                  <span>{{ cart.count.value }}</span>
                </div>
                <div v-if="appliedPromo" class="flex justify-between text-green-600 dark:text-green-400">
                  <span>Réduction ({{ appliedPromo.type === 'percentage' ? `${appliedPromo.value}%` : `${(appliedPromo.value / 100).toFixed(2)} €` }})</span>
                  <span>-{{ (discountCents / 100).toFixed(2) }} €</span>
                </div>
                <div class="flex justify-between font-medium text-base">
                  <span>Total</span>
                  <span>{{ (finalTotalCents / 100).toFixed(2) }} €</span>
                </div>
              </div>

              <UButton
                type="submit"
                block
                color="neutral"
                size="md"
                :loading="loading"
                :disabled="needsPrintSelection"
                :trailing-icon="finalTotalCents === 0 ? 'i-lucide-check' : form.paymentMethod === 'cash' ? 'i-lucide-check' : 'i-lucide-credit-card'"
              >
                {{ finalTotalCents === 0 ? 'Confirmer la commande' : form.paymentMethod === 'cash' ? 'Confirmer la réservation' : `Payer ${(finalTotalCents / 100).toFixed(2)} € en CB` }}
              </UButton>

              <p v-if="needsPrintSelection" class="text-center text-xs text-amber-600 dark:text-amber-400">
                Choisissez la photo à imprimer dans votre panier pour continuer
              </p>
              <p v-else-if="finalTotalCents === 0" class="text-center text-xs text-muted/60">
                Offert grâce à votre code promo
              </p>
              <p v-else-if="form.paymentMethod === 'online'" class="text-center text-xs text-muted/60">
                Paiement sécurisé
              </p>
              <p v-else class="text-center text-xs text-muted/60">
                Réglez en espèces directement au stand
              </p>
            </div>
          </div>
        </form>
      </template>
    </div>
  </div>
</template>
