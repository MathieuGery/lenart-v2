<script setup lang="ts">
definePageMeta({
  layout: 'public'
})

const { data: collections } = await useFetch<PublicCollectionListItem[]>('/api/public/collections')

const recentCollections = computed(() => collections.value?.slice(0, 3) ?? [])

const coverPhotos = computed(() => collections.value?.slice(0, 4).map(c => c.coverUrl).filter(Boolean) ?? [])

const totalPhotos = computed(() => collections.value?.reduce((sum, c) => sum + c.photoCount, 0) ?? 0)

const steps = [
  {
    number: '01',
    title: 'Trouvez votre concours',
    description: 'Recherchez par nom, date ou discipline parmi tous les événements photographiés.'
  },
  {
    number: '02',
    title: 'Sélectionnez vos photos',
    description: 'Parcourez les galeries et ajoutez vos meilleurs clichés au panier.'
  },
  {
    number: '03',
    title: 'Obtenez vos fichiers',
    description: 'Payez en ligne ou au stand, recevez vos photos en haute résolution.'
  }
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="py-24 sm:py-36">
      <div class="max-w-6xl mx-auto px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <!-- Left: text -->
          <div>
            <p class="text-xs uppercase tracking-widest text-muted mb-6">
              Photographie équestre professionnelle
            </p>
            <h1 class="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-[1.05]">
              Vos concours,<br>
              <em class="not-italic font-medium">en images.</em>
            </h1>
            <p class="mt-6 text-base text-muted leading-relaxed max-w-md">
              Retrouvez les photos professionnelles de vos compétitions équestres — CSO, dressage, CCE, hunter — et téléchargez-les en haute résolution.
            </p>
            <div class="mt-10 flex flex-wrap items-center gap-4">
              <UButton
                to="/concours"
                size="lg"
                color="neutral"
                variant="solid"
                trailing-icon="i-lucide-arrow-right"
              >
                Voir les concours
              </UButton>
              <UButton
                to="/contact"
                size="lg"
                variant="ghost"
                color="neutral"
                class="text-muted"
              >
                Me contacter
              </UButton>
            </div>

            <!-- Stats -->
            <div
              v-if="collections && collections.length > 0"
              class="mt-12 flex items-center gap-8"
            >
              <div>
                <p class="text-2xl font-light tabular-nums">
                  {{ totalPhotos.toLocaleString('fr-FR') }}
                </p>
                <p class="text-xs text-muted mt-0.5">
                  photos disponibles
                </p>
              </div>
              <div class="w-px h-8 bg-default" />
              <div>
                <p class="text-2xl font-light tabular-nums">
                  {{ collections.length }}
                </p>
                <p class="text-xs text-muted mt-0.5">
                  {{ collections.length > 1 ? 'concours disponibles' : 'concours disponible' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Right: cover mosaic -->
          <div class="hidden lg:grid grid-cols-2 gap-2 h-120">
            <template v-if="coverPhotos.length >= 2">
              <!-- First photo: full height left -->
              <div class="overflow-hidden row-span-2">
                <img
                  :src="coverPhotos[0]!"
                  alt=""
                  class="size-full object-cover"
                >
              </div>
              <!-- Top right -->
              <div class="overflow-hidden">
                <img
                  :src="coverPhotos[1]!"
                  alt=""
                  class="size-full object-cover"
                >
              </div>
              <!-- Bottom right -->
              <div class="overflow-hidden relative">
                <img
                  v-if="coverPhotos[2]"
                  :src="coverPhotos[2]!"
                  alt=""
                  class="size-full object-cover"
                >
                <div v-else class="size-full bg-muted/10" />
                <!-- "Voir tout" overlay on last cell if more collections -->
                <NuxtLink
                  v-if="collections && collections.length > 3"
                  to="/concours"
                  class="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 text-white text-sm hover:bg-black/60 transition-colors"
                >
                  <span>+{{ collections.length - 3 }} concours</span>
                  <UIcon name="i-lucide-arrow-right" class="size-4" />
                </NuxtLink>
              </div>
            </template>
            <!-- Placeholder if no collections yet -->
            <template v-else>
              <div class="col-span-2 row-span-2 bg-muted/10 flex items-center justify-center">
                <UIcon name="i-lucide-camera" class="size-12 text-muted/30" />
              </div>
            </template>
          </div>
        </div>
      </div>
    </section>

    <!-- Recent collections -->
    <section class="pb-24 sm:pb-32 border-t border-default pt-20 sm:pt-28">
      <div class="max-w-6xl mx-auto px-6 lg:px-8">
        <div class="flex items-baseline justify-between mb-10">
          <h2 class="text-sm font-medium uppercase tracking-widest text-muted">
            Derniers concours
          </h2>
          <NuxtLink
            to="/concours"
            class="inline-flex items-center gap-1 text-xs text-muted hover:text-highlighted transition-colors"
          >
            Tout voir
            <UIcon name="i-lucide-arrow-right" class="size-3" />
          </NuxtLink>
        </div>

        <!-- Real data -->
        <div v-if="recentCollections.length" class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <NuxtLink
            v-for="collection in recentCollections"
            :key="collection.id"
            :to="`/concours/${collection.id}`"
            class="group"
          >
            <div class="relative aspect-4/3 overflow-hidden bg-muted/10">
              <img
                v-if="collection.coverUrl"
                :src="collection.coverUrl"
                :alt="collection.name"
                class="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              >
              <div v-else class="size-full flex items-center justify-center">
                <UIcon name="i-lucide-image" class="size-8 text-muted/30" />
              </div>
            </div>
            <div class="mt-3 flex items-baseline justify-between gap-2">
              <h3 class="text-sm font-medium group-hover:underline underline-offset-4 truncate">
                {{ collection.name }}
              </h3>
              <span class="text-xs text-muted shrink-0">{{ collection.photoCount }} photos</span>
            </div>
            <p class="text-xs text-muted mt-1">
              {{ new Date(collection.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }}
            </p>
          </NuxtLink>
        </div>

        <!-- No collections yet -->
        <div v-else class="py-20 text-center">
          <UIcon name="i-lucide-calendar-x" class="size-10 text-muted/30 mx-auto" />
          <p class="mt-4 text-sm text-muted">
            Aucun concours disponible pour le moment.
          </p>
          <p class="text-xs text-muted/60 mt-1">
            Revenez bientôt !
          </p>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="py-24 sm:py-32 border-t border-default">
      <div class="max-w-6xl mx-auto px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-12 lg:gap-8 items-start">
          <div class="lg:col-span-1">
            <h2 class="text-sm font-medium uppercase tracking-widest text-muted">
              Comment ça marche
            </h2>
            <p class="mt-4 text-sm text-muted leading-relaxed hidden lg:block">
              En quelques minutes, retrouvez et téléchargez vos photos de compétition.
            </p>
            <UButton
              to="/concours"
              size="sm"
              color="neutral"
              variant="outline"
              class="mt-6 hidden lg:inline-flex"
            >
              Commencer
            </UButton>
          </div>

          <div class="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
            <div v-for="step in steps" :key="step.number" class="relative">
              <span class="block text-3xl font-light text-muted/30 leading-none mb-4 tabular-nums">
                {{ step.number }}
              </span>
              <h3 class="text-base font-medium mb-2">
                {{ step.title }}
              </h3>
              <p class="text-sm text-muted leading-relaxed">
                {{ step.description }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-24 sm:py-32 border-t border-default">
      <div class="max-w-6xl mx-auto px-6 lg:px-8">
        <div class="max-w-lg">
          <h2 class="text-3xl sm:text-4xl font-light tracking-tight">
            Prêt à retrouver<br>vos photos ?
          </h2>
          <p class="mt-4 text-sm text-muted leading-relaxed">
            Des milliers de clichés de concours équestres vous attendent en haute résolution.
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <UButton
              to="/concours"
              size="lg"
              color="neutral"
              variant="solid"
              trailing-icon="i-lucide-arrow-right"
            >
              Parcourir les concours
            </UButton>
            <UButton
              to="/about"
              size="lg"
              color="neutral"
              variant="outline"
            >
              En savoir plus
            </UButton>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
