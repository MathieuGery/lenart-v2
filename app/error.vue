<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const is404 = computed(() => props.error.statusCode === 404)

useSeoMeta({
  title: is404.value ? 'Page introuvable — Len-Art' : 'Erreur — Len-Art'
})

const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <UApp>
    <div class="min-h-screen flex flex-col">
      <!-- Header minimal -->
      <header class="px-6 lg:px-8 h-14 flex items-center">
        <NuxtLink to="/" class="text-lg tracking-tight font-medium" @click.prevent="handleError">
          Len-Art
        </NuxtLink>
      </header>

      <!-- Content -->
      <main class="flex-1 flex items-center justify-center px-6">
        <div class="max-w-md w-full">
          <p class="text-xs uppercase tracking-widest text-muted mb-6">
            {{ error.statusCode }}
          </p>

          <h1 class="text-4xl sm:text-5xl font-light tracking-tight leading-tight">
            <template v-if="is404">
              Page<br>introuvable.
            </template>
            <template v-else>
              Une erreur<br>est survenue.
            </template>
          </h1>

          <p class="mt-5 text-sm text-muted leading-relaxed">
            <template v-if="is404">
              La page que vous recherchez n'existe pas ou a été déplacée.
            </template>
            <template v-else>
              Quelque chose s'est mal passé. Revenez à l'accueil et réessayez.
            </template>
          </p>

          <div class="mt-10 flex flex-wrap gap-3">
            <UButton
              color="neutral"
              variant="solid"
              size="lg"
              trailing-icon="i-lucide-arrow-right"
              @click="handleError"
            >
              Retour à l'accueil
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              size="lg"
              to="/concours"
              @click="clearError"
            >
              Voir les concours
            </UButton>
          </div>
        </div>
      </main>

      <!-- Footer minimal -->
      <footer class="px-6 lg:px-8 py-6">
        <p class="text-xs text-muted/50">
          &copy; {{ new Date().getFullYear() }} Len-Art
        </p>
      </footer>
    </div>
  </UApp>
</template>
