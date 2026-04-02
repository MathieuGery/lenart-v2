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

watch(containerRef, () => {
  if (containerRef.value) refreshLazy()
})

// Cart
const cart = useCart()
const toast = useToast()

// Mobile formula preview — which formula's details are expanded
const previewedFormulaId = ref<string | null>(null)

function mobileFormulaClick(f: NonNullable<typeof formulas.value>[number]) {
  // First tap: expand details
  if (previewedFormulaId.value !== f.id) {
    previewedFormulaId.value = f.id
    return
  }
  // Second tap on expanded: select/deselect
  selectFormula(f)
}

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
            <!-- ── MOBILE: stacked full-width cards ── -->
            <div class="sm:hidden space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wider text-muted">
                {{ formulas.length }} formule{{ formulas.length > 1 ? 's' : '' }} disponible{{ formulas.length > 1 ? 's' : '' }}
              </p>

              <div
                v-for="f in formulas"
                :key="f.id"
                class="relative rounded-2xl border-2 p-4 transition-all"
                :class="[
                  cart.formula.value?.id === f.id
                    ? 'border-primary bg-primary/5'
                    : 'border-default active:border-muted',
                  f.isFeatured && cart.formula.value?.id !== f.id ? 'border-primary/30' : ''
                ]"
                @click="mobileFormulaClick(f)"
              >
                <!-- Featured ribbon -->
                <div
                  v-if="f.isFeatured"
                  class="absolute -top-3 right-4 px-2.5 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-wider rounded-full"
                >
                  Populaire
                </div>

                <!-- Top row: name + price + action -->
                <div class="flex items-center gap-3">
                  <!-- Radio circle -->
                  <div
                    class="size-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                    :class="cart.formula.value?.id === f.id ? 'border-primary bg-primary' : 'border-muted'"
                  >
                    <UIcon
                      v-if="cart.formula.value?.id === f.id"
                      name="i-lucide-check"
                      class="size-3.5 text-white"
                    />
                  </div>

                  <!-- Name + price -->
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold leading-tight">{{ f.name }}</p>
                    <p class="text-lg font-black mt-0.5">
                      {{ f.basePriceCents === 0 ? 'Sur devis' : `${(f.basePriceCents / 100).toFixed(2)} €` }}
                    </p>
                  </div>

                  <!-- Expand chevron -->
                  <UIcon
                    name="i-lucide-chevron-down"
                    class="size-4 text-muted shrink-0 transition-transform"
                    :class="{ 'rotate-180': previewedFormulaId === f.id }"
                  />
                </div>

                <!-- Expandable features -->
                <div
                  v-if="previewedFormulaId === f.id"
                  class="mt-3 pt-3 border-t border-default space-y-3"
                >
                  <ul class="space-y-2">
                    <li
                      v-for="feat in f.features"
                      :key="feat.id"
                      class="flex items-start gap-2 text-sm"
                    >
                      <UIcon name="i-lucide-check" class="size-4 text-green-500 shrink-0 mt-0.5" />
                      <span class="text-muted">{{ feat.featureText }}</span>
                    </li>
                    <li v-if="f.extraPhotoPriceCents" class="flex items-start gap-2 text-sm">
                      <UIcon name="i-lucide-plus" class="size-4 text-primary shrink-0 mt-0.5" />
                      <span class="text-muted">+{{ (f.extraPhotoPriceCents / 100).toFixed(2) }} € / photo supp.</span>
                    </li>
                  </ul>

                  <!-- CTA inside expanded -->
                  <button
                    type="button"
                    class="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                    :class="cart.formula.value?.id === f.id
                      ? 'bg-primary/10 text-primary'
                      : 'bg-primary text-white active:scale-[0.98]'"
                    @click.stop="selectFormula(f)"
                  >
                    {{ cart.formula.value?.id === f.id ? 'Sélectionnée' : 'Choisir cette formule' }}
                  </button>
                </div>

                <!-- Collapsed: feature count hint -->
                <p
                  v-else
                  class="mt-2 text-xs text-muted pl-9"
                >
                  <template v-if="f.features?.length">
                    {{ f.features[0].featureText }}
                    <span v-if="f.features.length > 1" class="text-primary font-medium"> +{{ f.features.length - 1 }} avantage{{ f.features.length - 1 > 1 ? 's' : '' }}</span>
                  </template>
                  <span class="text-primary font-medium"> — Voir le détail</span>
                </p>
              </div>
            </div>

            <!-- ── DESKTOP: side-by-side cards ── -->
            <div class="hidden sm:block">
              <p class="text-sm font-medium mb-4">
                Choisissez votre formule
              </p>
              <div class="grid gap-3" :style="{ gridTemplateColumns: `repeat(${Math.min(formulas.length, 3)}, minmax(0, 1fr))` }">
                <div
                  v-for="f in formulas"
                  :key="f.id"
                  class="border-2 rounded-xl p-5 cursor-pointer transition-all flex flex-col gap-2.5 relative"
                  :class="[
                    cart.formula.value?.id === f.id
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-default hover:border-muted',
                    f.isFeatured && cart.formula.value?.id !== f.id ? 'ring-2 ring-primary/20 border-primary/40' : ''
                  ]"
                  @click="selectFormula(f)"
                >
                  <div
                    v-if="f.isFeatured"
                    class="absolute -top-3 left-4 px-2.5 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-wider rounded-full"
                  >
                    Populaire
                  </div>

                  <div class="flex items-center justify-between">
                    <span class="text-sm font-bold uppercase tracking-wide">{{ f.name.replace('Formule ', '') }}</span>
                    <div
                      v-if="cart.formula.value?.id === f.id"
                      class="size-6 rounded-full bg-primary flex items-center justify-center shrink-0"
                    >
                      <UIcon name="i-lucide-check" class="size-3.5 text-white" />
                    </div>
                  </div>

                  <div class="flex items-baseline gap-1">
                    <span class="text-3xl font-black tracking-tight">
                      {{ f.basePriceCents === 0 ? 'Devis' : `${Math.floor(f.basePriceCents / 100)}` }}
                    </span>
                    <span v-if="f.basePriceCents > 0" class="text-lg font-bold text-muted">
                      ,{{ String(f.basePriceCents % 100).padStart(2, '0') }} €
                    </span>
                  </div>

                  <div class="h-px bg-default" />

                  <ul class="space-y-2 mt-0.5">
                    <li
                      v-for="feat in f.features"
                      :key="feat.id"
                      class="flex items-start gap-2 text-sm"
                    >
                      <UIcon name="i-lucide-check" class="size-4 text-green-500 shrink-0 mt-0.5" />
                      <span class="text-muted">{{ feat.featureText }}</span>
                    </li>
                    <li v-if="f.extraPhotoPriceCents" class="flex items-start gap-2 text-sm">
                      <UIcon name="i-lucide-plus" class="size-4 text-primary shrink-0 mt-0.5" />
                      <span class="text-muted">+{{ (f.extraPhotoPriceCents / 100).toFixed(2) }} €/photo supp.</span>
                    </li>
                  </ul>

                  <div
                    class="mt-auto pt-3 text-center text-sm font-semibold py-2.5 rounded-lg transition-all"
                    :class="cart.formula.value?.id === f.id
                      ? 'bg-primary text-white'
                      : 'bg-elevated text-highlighted'"
                  >
                    {{ cart.formula.value?.id === f.id ? 'Sélectionnée' : 'Choisir cette formule' }}
                  </div>
                </div>
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

          <!-- Photos grid (visible only after formula selection) -->
          <template v-if="cart.formula.value">
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

          <!-- No formula selected -->
          <div v-else-if="collection.photos.length" class="mt-12 text-center">
            <UIcon name="i-lucide-image" class="size-10 text-muted/40 mx-auto" />
            <p class="mt-4 text-sm font-medium">
              {{ collection.photos.length }} photo{{ collection.photos.length > 1 ? 's' : '' }} disponible{{ collection.photos.length > 1 ? 's' : '' }}
            </p>
            <p class="mt-1 text-sm text-muted">
              Choisissez une formule ci-dessus pour voir les photos.
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
          class="fixed left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-auto z-40 flex items-center justify-between gap-3 px-5 py-3 rounded-full bg-default shadow-lg border border-default"
          style="bottom: max(1.5rem, calc(env(safe-area-inset-bottom) + 0.5rem))"
        >
          <span class="text-sm whitespace-nowrap">
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

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
@keyframes bounce-x {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(4px); }
}
.animate-bounce-x {
  animation: bounce-x 1.2s ease-in-out infinite;
}
</style>
