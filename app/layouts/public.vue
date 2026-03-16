<script setup lang="ts">
const colorMode = useColorMode()

const links = [
  { label: 'Concours', to: '/concours' },
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
            <UButton
              :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
              color="neutral"
              variant="ghost"
              size="sm"
              square
              @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
            />
            <UButton
              to="/login"
              variant="ghost"
              color="neutral"
              size="sm"
            >
              Connexion
            </UButton>
          </div>
        </div>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="mt-auto">
      <div class="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <span class="text-sm tracking-tight">Len-Art</span>
          <p class="text-xs text-muted">
            &copy; {{ new Date().getFullYear() }} Len-Art — Tous droits réservés
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>
