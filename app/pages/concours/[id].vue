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

// Lightbox
const lightboxIndex = ref<number | null>(null)

const lightboxPhoto = computed(() => {
  if (lightboxIndex.value === null || !collection.value) return null
  return collection.value.photos[lightboxIndex.value] ?? null
})

function openLightbox(index: number) {
  lightboxIndex.value = index
}

function closeLightbox() {
  lightboxIndex.value = null
}

function prevPhoto() {
  if (lightboxIndex.value === null || !collection.value) return
  lightboxIndex.value = (lightboxIndex.value - 1 + collection.value.photos.length) % collection.value.photos.length
}

function nextPhoto() {
  if (lightboxIndex.value === null || !collection.value) return
  lightboxIndex.value = (lightboxIndex.value + 1) % collection.value.photos.length
}

function onKeydown(e: KeyboardEvent) {
  if (lightboxIndex.value === null) return
  if (e.key === 'Escape') closeLightbox()
  if (e.key === 'ArrowLeft') prevPhoto()
  if (e.key === 'ArrowRight') nextPhoto()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
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
            <button
              v-for="(photo, index) in collection.photos"
              :key="photo.id"
              type="button"
              class="relative aspect-4/3 overflow-hidden bg-muted/10 rounded group cursor-zoom-in"
              @click="openLightbox(index)"
            >
              <img
                class="lazy-img size-full object-cover transition-all duration-300 group-hover:scale-[1.03] group-hover:brightness-90"
                :data-src="photo.url"
                :alt="photo.filename"
                style="opacity: 0"
                @load="($event.target as HTMLImageElement).style.opacity = '1'"
              >
            </button>
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

    <!-- Lightbox -->
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
          v-if="lightboxIndex !== null && lightboxPhoto"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          @click.self="closeLightbox"
        >
          <!-- Close -->
          <button
            type="button"
            class="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            @click="closeLightbox"
          >
            <UIcon name="i-lucide-x" class="size-6" />
          </button>

          <!-- Counter -->
          <span class="absolute top-4 left-1/2 -translate-x-1/2 text-xs text-white/50">
            {{ lightboxIndex + 1 }} / {{ collection?.photos.length }}
          </span>

          <!-- Prev -->
          <button
            v-if="(collection?.photos.length ?? 0) > 1"
            type="button"
            class="absolute left-4 text-white/70 hover:text-white transition-colors"
            @click="prevPhoto"
          >
            <UIcon name="i-lucide-chevron-left" class="size-8" />
          </button>

          <!-- Image -->
          <img
            :key="lightboxPhoto.id"
            :src="lightboxPhoto.url"
            :alt="lightboxPhoto.filename"
            class="max-h-[90vh] max-w-[90vw] object-contain"
          >

          <!-- Next -->
          <button
            v-if="(collection?.photos.length ?? 0) > 1"
            type="button"
            class="absolute right-4 text-white/70 hover:text-white transition-colors"
            @click="nextPhoto"
          >
            <UIcon name="i-lucide-chevron-right" class="size-8" />
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
