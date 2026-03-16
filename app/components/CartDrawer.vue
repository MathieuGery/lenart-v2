<script setup lang="ts">
const cart = useCart()
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
              <h2 class="font-medium text-sm">
                Mon panier
                <span class="ml-1.5 text-muted font-normal">({{ cart.count.value }})</span>
              </h2>
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

            <!-- Items -->
            <div class="flex-1 overflow-y-auto">
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

              <!-- Empty -->
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

            <!-- Footer -->
            <div
              v-if="cart.count.value > 0"
              class="p-4 border-t border-default"
            >
              <UButton
                block
                color="neutral"
                size="md"
              >
                Commander {{ cart.count.value }} photo{{ cart.count.value > 1 ? 's' : '' }}
              </UButton>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
