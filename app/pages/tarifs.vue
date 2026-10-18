<script setup lang="ts">
definePageMeta({
  layout: 'public'
})

useSeoMeta({
  title: 'Tarifs | Len-Art',
  description: 'Découvrez les formules photo Len-Art et retrouvez les photos de vos compétitions équestres.'
})

const { data: formulas, status, error, refresh } = await useFetch('/api/public/pricing')
const { data: collections } = await useFetch<PublicCollectionListItem[]>('/api/public/collections')
const recentCollections = computed(() => collections.value?.filter(collection => collection.coverUrl).slice(0, 3) ?? [])

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

function formatPrice(cents: number) {
  return currency.format(cents / 100)
}

async function retry() {
  await refresh()
}
</script>

<template>
  <div>
    <section class="py-16 sm:py-20">
      <div class="max-w-6xl mx-auto px-6 lg:px-8">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div class="max-w-xl">
            <h1 class="text-3xl sm:text-4xl font-light">
              Tarifs
            </h1>
            <p class="mt-3 text-sm text-muted leading-relaxed">
              Un souvenir, une sélection ou votre tour complet : retrouvez la formule qui vous correspond.
            </p>
          </div>
          <UButton
            to="/concours"
            color="neutral"
            trailing-icon="i-lucide-arrow-right"
            class="self-start shrink-0"
          >
            Voir les collections
          </UButton>
        </div>

        <div
          v-if="status === 'pending'"
          class="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          role="status"
          aria-label="Chargement des tarifs"
        >
          <div v-for="placeholder in 3" :key="placeholder" class="border border-default rounded-lg p-6 space-y-6">
            <USkeleton class="h-6 w-1/2" />
            <USkeleton class="h-10 w-1/3" />
            <USkeleton class="h-24 w-full" />
            <USkeleton class="h-10 w-full" />
          </div>
        </div>

        <div v-else-if="error" class="mt-12 py-12 text-center" role="alert">
          <UIcon name="i-lucide-circle-alert" class="size-8 text-muted mx-auto" />
          <p class="mt-4 text-sm text-muted">
            Les tarifs sont momentanément indisponibles.
          </p>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-refresh-cw"
            class="mt-5"
            @click="retry"
          >
            Réessayer
          </UButton>
        </div>

        <div v-else-if="formulas?.length" class="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <article
            v-for="formula in formulas"
            :key="formula.id"
            class="min-w-0 flex flex-col rounded-lg border p-6 sm:p-8"
            :class="formula.isFeatured ? 'border-highlighted bg-elevated/30' : 'border-default'"
          >
            <div class="min-h-6 mb-4">
              <UBadge
                v-if="formula.isFeatured"
                color="neutral"
                variant="subtle"
                label="Notre sélection"
              />
            </div>
            <h2 class="text-xl font-medium wrap-break-word">
              {{ formula.name }}
            </h2>
            <p v-if="formula.description" class="mt-3 text-sm text-muted leading-relaxed wrap-break-word">
              {{ formula.description }}
            </p>
            <p class="mt-6 text-3xl font-light tabular-nums">
              {{ formatPrice(formula.basePriceCents) }}
            </p>

            <ul class="mt-6 pt-6 border-t border-default space-y-3 text-sm">
              <template v-if="!formula.features.length">
                <li class="flex items-start gap-3">
                  <UIcon name="i-lucide-images" class="size-4 shrink-0 mt-0.5 text-muted" />
                  <span v-if="formula.isTourComplete">Toutes les photos de votre tour</span>
                  <span v-else>
                    {{ formula.digitalPhotosCount }} photo{{ formula.digitalPhotosCount > 1 ? 's' : '' }} numérique{{ formula.digitalPhotosCount > 1 ? 's' : '' }}
                  </span>
                </li>
                <li v-if="formula.printDetails" class="flex items-start gap-3">
                  <UIcon name="i-lucide-printer" class="size-4 shrink-0 mt-0.5 text-muted" />
                  <span class="wrap-break-word min-w-0">{{ formula.printDetails }}</span>
                </li>
                <li v-if="!formula.isTourComplete && formula.extraPhotoPriceCents != null" class="flex items-start gap-3">
                  <UIcon name="i-lucide-image-plus" class="size-4 shrink-0 mt-0.5 text-muted" />
                  <span>{{ formatPrice(formula.extraPhotoPriceCents) }} par photo supplémentaire</span>
                </li>
              </template>
              <li v-for="feature in formula.features" :key="feature.id" class="flex items-start gap-3">
                <UIcon name="i-lucide-check" class="size-4 shrink-0 mt-0.5 text-muted" />
                <span class="wrap-break-word min-w-0">{{ feature.featureText }}</span>
              </li>
            </ul>

            <div class="mt-auto pt-8">
              <UButton
                to="/concours"
                color="neutral"
                :variant="formula.isFeatured ? 'solid' : 'outline'"
                trailing-icon="i-lucide-arrow-right"
                block
              >
                Trouver mes photos
              </UButton>
            </div>
          </article>
        </div>

        <div v-else class="mt-12 py-12 text-center">
          <UIcon name="i-lucide-tags" class="size-8 text-muted mx-auto" />
          <p class="mt-4 text-sm text-muted">
            Aucune formule disponible pour le moment.
          </p>
          <UButton
            to="/contact"
            color="neutral"
            variant="outline"
            class="mt-5"
          >
            Me contacter
          </UButton>
        </div>
      </div>
    </section>

    <section class="border-t border-default py-16 sm:py-20">
      <div class="max-w-6xl mx-auto px-6 lg:px-8">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h2 class="text-2xl font-light">
              Retrouvez vos photos de concours
            </h2>
            <p class="mt-3 text-sm text-muted">
              Vos plus beaux moments en piste vous attendent.
            </p>
          </div>
          <UButton
            to="/concours"
            color="neutral"
            size="lg"
            trailing-icon="i-lucide-arrow-right"
            class="self-start shrink-0"
          >
            Explorer les collections
          </UButton>
        </div>
        <div v-if="recentCollections.length" class="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <NuxtLink
            v-for="collection in recentCollections"
            :key="collection.id"
            :to="`/concours/${collection.id}`"
            class="group min-w-0"
          >
            <div class="aspect-4/3 overflow-hidden bg-elevated">
              <img
                :src="collection.coverUrl!"
                :alt="collection.name"
                loading="lazy"
                class="size-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
              >
            </div>
            <h3 class="mt-3 text-sm font-medium wrap-break-word group-hover:underline underline-offset-4">
              {{ collection.name }}
            </h3>
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
