<script setup lang="ts">
const cart = useCart()

function goToCheckout() {
  cart.isOpen.value = false
  navigateTo('/commande')
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
                <h2 class="font-medium text-sm">
                  Mon panier
                  <span class="ml-1.5 text-muted font-normal">({{ cart.count.value }})</span>
                </h2>
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="cart.count.value > 0"
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

            <!-- Print photo selector -->
            <div
              v-if="cart.formula.value?.printDetails && cart.items.value.length > 0"
              class="border-t border-default px-5 py-4"
            >
              <div class="flex items-center gap-1.5 mb-3">
                <UIcon name="i-lucide-printer" class="size-3.5 text-muted" />
                <p class="text-xs font-medium">
                  Photo à imprimer
                  <span class="text-muted font-normal ml-1">({{ cart.formula.value.printDetails }})</span>
                </p>
              </div>
              <p v-if="!cart.printPhotoId.value" class="text-xs text-amber-600 dark:text-amber-400 mb-2">
                Sélectionnez la photo que vous souhaitez en impression physique.
              </p>
              <div class="flex flex-col gap-1.5">
                <button
                  v-for="item in cart.items.value"
                  :key="item.id"
                  type="button"
                  class="flex items-center gap-2.5 px-3 py-2 rounded-lg border-2 text-left transition-colors text-sm"
                  :class="cart.printPhotoId.value === item.id
                    ? 'border-primary bg-primary/5'
                    : 'border-default hover:border-muted'"
                  @click="cart.setPrintPhoto(cart.printPhotoId.value === item.id ? null : item.id)"
                >
                  <img :src="item.url" :alt="item.filename" class="size-8 rounded object-cover shrink-0 bg-muted/10">
                  <span class="flex-1 truncate text-xs">{{ item.filename }}</span>
                  <div
                    v-if="cart.printPhotoId.value === item.id"
                    class="size-5 rounded-full bg-primary flex items-center justify-center shrink-0"
                  >
                    <UIcon name="i-lucide-printer" class="size-2.5 text-white" />
                  </div>
                </button>
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
                :disabled="!!(cart.formula.value?.printDetails && cart.items.value.length > 0 && !cart.printPhotoId.value)"
                @click="goToCheckout"
              >
                Commander — {{ (cart.totalCents.value / 100).toFixed(2) }} €
              </UButton>
              <p
                v-if="cart.formula.value?.printDetails && cart.items.value.length > 0 && !cart.printPhotoId.value"
                class="text-center text-xs text-amber-600 dark:text-amber-400"
              >
                Choisissez la photo à imprimer pour continuer
              </p>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
