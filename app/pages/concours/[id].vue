<script setup lang="ts">
definePageMeta({
  layout: 'public'
})

const route = useRoute()
const id = route.params.id as string

const { data: collection, status } = await useFetch(`/api/public/collections/${id}`)

if (status.value === 'error' || (!collection.value && status.value !== 'pending')) {
  throw createError({ statusCode: 404, message: 'Concours introuvable' })
}

const containerRef = ref<HTMLElement | null>(null)
const { refresh: refreshLazy } = useLazyImages(containerRef)

watch(() => collection.value?.photos, () => {
  refreshLazy()
})
</script>

<template>
  <div>
    <section class="py-20 sm:py-28">
      <div class="max-w-6xl mx-auto px-6 lg:px-8">
        <!-- Back link -->
        <NuxtLink
          to="/concours"
          class="inline-flex items-center gap-1.5 text-xs text-muted hover:text-highlighted transition-colors mb-8"
        >
          <UIcon name="i-lucide-arrow-left" class="size-3.5" />
          Retour aux concours
        </NuxtLink>

        <!-- Loading -->
        <template v-if="status === 'pending'">
          <div class="animate-pulse">
            <div class="h-8 w-1/3 bg-muted/20 rounded" />
            <div class="mt-3 h-4 w-1/2 bg-muted/20 rounded" />
            <div class="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <div v-for="i in 8" :key="i" class="aspect-4/3 bg-muted/20 rounded" />
            </div>
          </div>
        </template>

        <template v-else-if="collection">
          <!-- Header -->
          <h1 class="text-3xl sm:text-4xl font-light tracking-tight">
            {{ collection.name }}
          </h1>
          <p v-if="collection.description" class="mt-3 text-sm text-muted max-w-lg">
            {{ collection.description }}
          </p>
          <p class="mt-2 text-xs text-muted">
            {{ collection.photos.length }} photo{{ collection.photos.length > 1 ? 's' : '' }}
            &middot;
            {{ new Date(collection.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }}
          </p>

          <!-- Photos grid -->
          <div
            v-if="collection.photos.length"
            ref="containerRef"
            class="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
          >
            <div
              v-for="photo in collection.photos"
              :key="photo.id"
              class="relative aspect-4/3 overflow-hidden bg-muted/10 rounded group"
            >
              <img
                class="lazy-img size-full object-cover transition-opacity duration-300"
                :data-src="photo.url"
                :alt="photo.filename"
                style="opacity: 0"
                @load="($event.target as HTMLImageElement).style.opacity = '1'"
              >
            </div>
          </div>

          <!-- Empty -->
          <div v-else class="mt-20 text-center">
            <UIcon name="i-lucide-image-off" class="size-10 text-muted/40 mx-auto" />
            <p class="mt-4 text-sm text-muted">
              Aucune photo dans ce concours.
            </p>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>
