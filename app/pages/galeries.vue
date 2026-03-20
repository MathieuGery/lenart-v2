<script setup lang="ts">
definePageMeta({
  layout: 'public'
})

const code = ref('')
const galleries = ref<PublicGalleryItem[]>([])
const loading = ref(false)
const error = ref('')
const searched = ref(false)

async function search() {
  if (!code.value.trim()) return
  loading.value = true
  error.value = ''
  searched.value = true

  try {
    galleries.value = await $fetch<PublicGalleryItem[]>(`/api/public/galleries/${encodeURIComponent(code.value.trim())}`)
  } catch {
    galleries.value = []
    error.value = 'Aucune galerie trouvée pour ce code.'
  } finally {
    loading.value = false
  }
}

function formatDate(date: string | null) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<template>
  <div>
    <section class="py-20 sm:py-28">
      <div class="max-w-2xl mx-auto px-6 lg:px-8">
        <h1 class="text-3xl sm:text-4xl font-light tracking-tight">
          Galeries privées
        </h1>
        <p class="mt-3 text-sm text-muted max-w-lg">
          Entrez le code fourni pour accéder à vos galeries photos.
        </p>

        <!-- Search form -->
        <form class="mt-10 flex gap-3" @submit.prevent="search">
          <UInput
            v-model="code"
            placeholder="Entrez votre code"
            color="neutral"
            size="lg"
            class="flex-1"
            :disabled="loading"
          />
          <UButton
            type="submit"
            color="neutral"
            size="lg"
            :loading="loading"
            :disabled="!code.trim()"
          >
            Accéder
          </UButton>
        </form>

        <!-- Error -->
        <div v-if="error" class="mt-10 text-center">
          <UIcon name="i-lucide-search-x" class="size-10 text-muted/40 mx-auto" />
          <p class="mt-4 text-sm text-muted">{{ error }}</p>
        </div>

        <!-- Results -->
        <div v-if="galleries.length" class="mt-10 space-y-4">
          <div
            v-for="(gallery, i) in galleries"
            :key="i"
            class="flex items-center justify-between gap-4 p-4 border border-default rounded-lg hover:bg-elevated/30 transition-colors"
          >
            <div class="min-w-0">
              <h2 class="text-sm font-medium">{{ gallery.title }}</h2>
              <p v-if="gallery.date" class="text-xs text-muted mt-0.5">
                {{ formatDate(gallery.date) }}
              </p>
            </div>
            <a
              :href="gallery.link"
              target="_blank"
              rel="noopener"
              class="shrink-0"
            >
              <UButton color="neutral" variant="subtle" size="sm" icon="i-lucide-external-link" trailing>
                Voir les photos
              </UButton>
            </a>
          </div>
        </div>

        <!-- Empty state after search -->
        <div v-else-if="searched && !loading && !error" class="mt-10 text-center">
          <UIcon name="i-lucide-image-off" class="size-10 text-muted/40 mx-auto" />
          <p class="mt-4 text-sm text-muted">Aucune galerie trouvée.</p>
        </div>
      </div>
    </section>
  </div>
</template>