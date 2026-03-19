<script setup lang="ts">
definePageMeta({
  layout: 'public'
})

const route = useRoute()
const id = route.params.id as string

const { data: collection, status } = await useFetch<CollectionDetail>(`/api/public/collections/${id}`)
const { data: formulas } = await useFetch<PricingFormula[]>('/api/public/pricing')

if (status.value === 'error' || (!collection.value && status.value !== 'pending')) {
  throw createError({ statusCode: 404, message: 'Concours introuvable' })
}

const containerRef = ref<HTMLElement | null>(null)
const { refresh: refreshLazy } = useLazyImages(containerRef)

watch(() => collection.value?.photos, () => {
  refreshLazy()
})

// Cart
const cart = useCart()
const toast = useToast()

function selectFormula(f: NonNullable<typeof formulas.value>[number]) {
  if (cart.formula.value?.id === f.id) {
    cart.clearCart()
    return
  }

  cart.setFormula({
    id: f.id,
    name: f.name,
    description: f.description,
    basePriceCents: f.basePriceCents,
    digitalPhotosCount: f.digitalPhotosCount,
    extraPhotoPriceCents: f.extraPhotoPriceCents,
    isTourComplete: f.isTourComplete,
    printDetails: f.printDetails
  })

  // TOUR D'HONNEUR: auto-sélectionne toutes les photos
  if (f.isTourComplete && collection.value) {
    for (const photo of collection.value.photos) {
      cart.addToCart({
        id: photo.id,
        filename: photo.filename,
        url: photo.url,
        collectionId: id,
        collectionName: collection.value.name
      })
    }
  }
}

function handleCartToggle(photo: { id: string, filename: string, url: string }) {
  if (!cart.formula.value) {
    toast.add({ title: 'Choisissez d\'abord une formule', color: 'neutral', duration: 2000 })
    return
  }
  if (cart.formula.value.isTourComplete) return

  if (cart.isInCart(photo.id)) {
    cart.removeFromCart(photo.id)
    return
  }

  if (!cart.canAddMore()) {
    toast.add({
      title: `Limite atteinte pour cette formule`,
      description: cart.formula.value.extraPhotoPriceCents
        ? undefined
        : `La formule ${cart.formula.value.name} inclut ${cart.formula.value.digitalPhotosCount} photo(s)`,
      color: 'neutral',
      duration: 2500
    })
    return
  }

  cart.addToCart({
    id: photo.id,
    filename: photo.filename,
    url: photo.url,
    collectionId: id,
    collectionName: collection.value?.name ?? ''
  })
}

// Guidance text
const guidanceText = computed(() => {
  const f = cart.formula.value
  if (!f) return null
  if (f.isTourComplete) return 'Toutes les photos de ce concours sont incluses dans votre formule.'
  const needed = f.digitalPhotosCount - cart.count.value
  if (needed <= 0) {
    if (f.extraPhotoPriceCents != null) {
      return `${cart.count.value} photo(s) sélectionnée(s) — vous pouvez en ajouter davantage (+${(f.extraPhotoPriceCents / 100).toFixed(2)} € / photo)`
    }
    return null
  }
  return `Sélectionnez encore ${needed} photo${needed > 1 ? 's' : ''}`
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

          <!-- ── Formules ───────────────────────────────────────────── -->
          <div v-if="formulas?.length" class="mt-10">
            <p class="text-sm font-medium mb-4">
              Choisissez votre formule
            </p>
            <!-- Horizontal scroll on mobile, wrap on desktop -->
            <div class="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 sm:mx-0 sm:px-0 sm:flex-wrap snap-x snap-mandatory">
              <div
                v-for="f in formulas"
                :key="f.id"
                class="snap-start shrink-0 w-52 sm:w-auto sm:min-w-44 border-2 rounded-xl p-4 cursor-pointer transition-all flex flex-col gap-2"
                :class="cart.formula.value?.id === f.id
                  ? 'border-primary bg-primary/5'
                  : 'border-default hover:border-muted'"
                @click="selectFormula(f)"
              >
                <!-- Selected indicator -->
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold uppercase tracking-wide text-muted">{{ f.name.replace('Formule ', '') }}</span>
                  <div
                    v-if="cart.formula.value?.id === f.id"
                    class="size-4 rounded-full bg-primary flex items-center justify-center shrink-0"
                  >
                    <UIcon name="i-lucide-check" class="size-2.5 text-white" />
                  </div>
                </div>

                <!-- Price -->
                <div class="text-xl font-bold">
                  {{ f.basePriceCents === 0 ? 'Sur devis' : `${(f.basePriceCents / 100).toFixed(2)} €` }}
                </div>

                <!-- Features -->
                <ul class="space-y-1 mt-1">
                  <li
                    v-for="feat in f.features"
                    :key="feat.id"
                    class="flex items-start gap-1.5 text-xs text-muted"
                  >
                    <UIcon name="i-lucide-check" class="size-3 text-green-500 shrink-0 mt-0.5" />
                    {{ feat.featureText }}
                  </li>
                  <li v-if="f.extraPhotoPriceCents" class="flex items-start gap-1.5 text-xs text-muted">
                    <UIcon name="i-lucide-plus" class="size-3 text-muted shrink-0 mt-0.5" />
                    +{{ (f.extraPhotoPriceCents / 100).toFixed(2) }} €/photo supp.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Guidance banner -->
          <Transition
            enter-active-class="transition duration-200"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
          >
            <div
              v-if="guidanceText"
              class="mt-4 flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg"
              :class="cart.count.value >= (cart.formula.value?.digitalPhotosCount ?? 0) && !cart.formula.value?.isTourComplete
                ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                : 'bg-primary/5 text-primary'"
            >
              <UIcon
                :name="cart.count.value >= (cart.formula.value?.digitalPhotosCount ?? 0) && !cart.formula.value?.isTourComplete ? 'i-lucide-check-circle' : 'i-lucide-info'"
                class="size-4 shrink-0"
              />
              {{ guidanceText }}
            </div>
          </Transition>

          <!-- Photos grid -->
          <div
            v-if="collection.photos.length"
            ref="containerRef"
            class="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
          >
            <div
              v-for="(photo, index) in collection.photos"
              :key="photo.id"
              class="relative aspect-4/3 overflow-hidden bg-muted/10 rounded group cursor-zoom-in"
              @click="openLightbox(index)"
            >
              <!-- Image -->
              <img
                class="lazy-img size-full object-cover transition-all duration-300 group-hover:scale-[1.03] group-hover:brightness-90"
                :data-src="photo.url"
                :alt="photo.filename"
                style="opacity: 0"
                @load="($event.target as HTMLImageElement).style.opacity = '1'"
              >

              <!-- Tour complet overlay -->
              <div
                v-if="cart.formula.value?.isTourComplete"
                class="absolute inset-0 bg-primary/20 ring-2 ring-inset ring-primary rounded pointer-events-none flex items-center justify-center"
              >
                <UIcon name="i-lucide-check" class="size-5 text-white drop-shadow" />
              </div>

              <!-- Selected ring (hors tour complet) -->
              <div
                v-else-if="cart.isInCart(photo.id)"
                class="absolute inset-0 ring-2 ring-inset ring-primary rounded pointer-events-none"
              />

              <!-- Cart button (masqué si tour complet) -->
              <div v-if="!cart.formula.value?.isTourComplete" class="absolute bottom-2 right-2">
                <button
                  type="button"
                  class="size-7 rounded-full flex items-center justify-center text-white transition-colors"
                  :class="cart.isInCart(photo.id)
                    ? 'bg-primary'
                    : 'bg-black/40 active:bg-black/60'"
                  :title="cart.isInCart(photo.id) ? 'Retirer du panier' : 'Ajouter au panier'"
                  @click.stop="handleCartToggle(photo)"
                >
                  <UIcon
                    :name="cart.isInCart(photo.id) ? 'i-lucide-check' : 'i-lucide-shopping-cart'"
                    class="size-3.5"
                  />
                </button>
              </div>
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

    <!-- Floating cart bar -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-4"
      >
        <div
          v-if="cart.count.value > 0"
          class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-5 py-3 rounded-full bg-default shadow-lg border border-default"
        >
          <span class="text-sm">
            <span class="font-medium">{{ cart.count.value }}</span>
            photo{{ cart.count.value > 1 ? 's' : '' }}
            <span class="text-muted ml-1">— {{ (cart.totalCents.value / 100).toFixed(2) }} €</span>
          </span>
          <UButton
            size="sm"
            color="neutral"
            trailing-icon="i-lucide-shopping-cart"
            @click="cart.isOpen.value = true"
          >
            Commander
          </UButton>
        </div>
      </Transition>
    </Teleport>

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
          <button
            type="button"
            class="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            @click="closeLightbox"
          >
            <UIcon name="i-lucide-x" class="size-6" />
          </button>

          <span class="absolute top-4 left-1/2 -translate-x-1/2 text-xs text-white/50">
            {{ lightboxIndex + 1 }} / {{ collection?.photos.length }}
          </span>

          <button
            v-if="(collection?.photos.length ?? 0) > 1"
            type="button"
            class="absolute left-4 text-white/70 hover:text-white transition-colors"
            @click="prevPhoto"
          >
            <UIcon name="i-lucide-chevron-left" class="size-8" />
          </button>

          <img
            :key="lightboxPhoto.id"
            :src="lightboxPhoto.url"
            :alt="lightboxPhoto.filename"
            class="max-h-[90vh] max-w-[90vw] object-contain"
          >

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
