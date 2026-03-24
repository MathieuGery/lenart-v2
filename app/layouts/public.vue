<script setup lang="ts">
const colorMode = useColorMode()
const cart = useCart()

const links = [
  { label: 'Concours', to: '/concours' },
  { label: 'Galeries', to: '/galeries' },
  { label: 'À propos', to: '/about' },
  { label: 'Contact', to: '/contact' }
]
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="sticky top-0 z-50 backdrop-blur-md bg-[var(--ui-bg)]/80">
      <div class="max-w-6xl mx-auto px-6 lg:px-8">
        <div class="flex items-center justify-between h-14">
          <NuxtLink to="/" class="text-lg tracking-tight font-medium">
            Len-Art
          </NuxtLink>

          <nav class="hidden md:flex items-center gap-8">
            <NuxtLink
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              class="text-[13px] text-muted hover:text-highlighted transition-colors"
            >
              {{ link.label }}
            </NuxtLink>
          </nav>

          <div class="flex items-center gap-2">
            <a href="https://www.instagram.com/len_._art" target="_blank" rel="noopener noreferrer">
              <UButton
                icon="i-lucide-instagram"
                color="neutral"
                variant="ghost"
                size="sm"
                square
              />
            </a>
            <UButton
              :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
              color="neutral"
              variant="ghost"
              size="sm"
              square
              @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
            />
            <!-- Cart button -->
            <button
              type="button"
              class="relative flex items-center justify-center size-8 text-muted hover:text-highlighted transition-colors"
              @click="cart.isOpen.value = true"
            >
              <UIcon name="i-lucide-shopping-cart" class="size-4" />
              <span
                v-if="cart.count.value > 0"
                class="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-primary text-(--ui-bg) text-[10px] font-medium rounded-full flex items-center justify-center leading-none"
              >
                {{ cart.count.value }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <CartDrawer />

    <footer class="mt-auto">
      <div class="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="text-sm tracking-tight">Len-Art</span>
            <a
              href="https://www.instagram.com/len_._art"
              target="_blank"
              rel="noopener noreferrer"
              class="text-muted hover:text-highlighted transition-colors"
            >
              <UIcon name="i-lucide-instagram" class="size-4" />
            </a>
          </div>
          <div class="flex items-center gap-3">
            <p class="text-xs text-muted">
              &copy; {{ new Date().getFullYear() }} Len-Art — Tous droits réservés
            </p>
            <NuxtLink to="/login" class="text-xs text-muted/50 hover:text-muted transition-colors">
              Admin
            </NuxtLink>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
