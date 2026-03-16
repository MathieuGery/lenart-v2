<script setup lang="ts">
definePageMeta({
  layout: 'public'
})

const { data: collections, status } = await useFetch('/api/public/collections')
</script>

<template>
  <div>
    <section class="py-20 sm:py-28">
      <div class="max-w-6xl mx-auto px-6 lg:px-8">
        <h1 class="text-3xl sm:text-4xl font-light tracking-tight">
          Concours
        </h1>
        <p class="mt-3 text-sm text-muted max-w-lg">
          Retrouvez les photos de vos compétitions équestres.
        </p>

        <div v-if="status === 'pending'" class="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 6" :key="i" class="animate-pulse">
            <div class="aspect-4/3 bg-muted/20 rounded" />
            <div class="mt-3 h-4 w-2/3 bg-muted/20 rounded" />
            <div class="mt-2 h-3 w-1/3 bg-muted/20 rounded" />
          </div>
        </div>

        <div v-else-if="collections?.length" class="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NuxtLink
            v-for="collection in collections"
            :key="collection.id"
            :to="`/concours/${collection.id}`"
            class="group"
          >
            <div class="relative aspect-4/3 overflow-hidden bg-muted/10 rounded">
              <img
                v-if="collection.coverUrl"
                :src="collection.coverUrl"
                :alt="collection.name"
                class="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              >
              <div v-else class="size-full flex items-center justify-center">
                <UIcon name="i-lucide-image" class="size-8 text-muted/40" />
              </div>
            </div>
            <div class="mt-3 flex items-baseline justify-between">
              <h2 class="text-sm font-medium group-hover:underline underline-offset-4">
                {{ collection.name }}
              </h2>
              <span class="text-xs text-muted">{{ collection.photoCount }} photos</span>
            </div>
            <p v-if="collection.description" class="text-xs text-muted mt-1 line-clamp-2">
              {{ collection.description }}
            </p>
            <p class="text-xs text-muted mt-1">
              {{ new Date(collection.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }}
            </p>
          </NuxtLink>
        </div>

        <div v-else class="mt-20 text-center">
          <UIcon name="i-lucide-camera-off" class="size-10 text-muted/40 mx-auto" />
          <p class="mt-4 text-sm text-muted">
            Aucun concours disponible pour le moment.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
