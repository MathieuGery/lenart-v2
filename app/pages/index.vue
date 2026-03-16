<script setup lang="ts">
definePageMeta({
  layout: 'public'
})

const steps = [
  {
    number: '01',
    title: 'Trouvez',
    description: 'Recherchez votre concours par date, lieu ou nom.'
  },
  {
    number: '02',
    title: 'Parcourez',
    description: 'Identifiez vos plus beaux moments en selle.'
  },
  {
    number: '03',
    title: 'Téléchargez',
    description: 'Obtenez vos photos en haute résolution.'
  }
]

const recentEvents = [
  {
    title: 'CSO Lamotte-Beuvron',
    date: '8–9 mars 2026',
    count: 342,
    image: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=600&h=400&fit=crop'
  },
  {
    title: 'Dressage Fontainebleau',
    date: '1–2 mars 2026',
    count: 218,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop'
  },
  {
    title: 'CCE Pompadour',
    date: '22–23 février 2026',
    count: 485,
    image: 'https://images.unsplash.com/photo-1566251037378-5e04e3bec343?w=600&h=400&fit=crop'
  }
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="py-32 sm:py-44">
      <div class="max-w-6xl mx-auto px-6 lg:px-8">
        <div class="max-w-2xl">
          <h1 class="text-4xl sm:text-5xl font-light tracking-tight leading-[1.1]">
            Vos concours équestres,<br>
            <span class="font-medium">immortalisés.</span>
          </h1>
          <p class="mt-6 text-base text-muted leading-relaxed max-w-lg">
            Retrouvez les photos professionnelles de vos compétitions. CSO, dressage, CCE, hunter.
          </p>
          <div class="mt-10 flex items-center gap-4">
            <UButton
              to="/concours"
              size="lg"
              color="neutral"
              variant="solid"
            >
              Voir les concours
            </UButton>
            <UButton
              to="/#how-it-works"
              size="lg"
              variant="link"
              color="neutral"
              class="text-muted"
            >
              En savoir plus
            </UButton>
          </div>
        </div>
      </div>
    </section>

    <!-- Recent Events -->
    <section class="pb-24 sm:pb-32">
      <div class="max-w-6xl mx-auto px-6 lg:px-8">
        <div class="flex items-baseline justify-between mb-8">
          <h2 class="text-sm font-medium uppercase tracking-widest text-muted">
            Derniers concours
          </h2>
          <NuxtLink to="/concours" class="text-xs text-muted hover:text-highlighted transition-colors">
            Tout voir
          </NuxtLink>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NuxtLink
            v-for="event in recentEvents"
            :key="event.title"
            to="/concours"
            class="group"
          >
            <div class="relative aspect-4/3 overflow-hidden">
              <img
                :src="event.image"
                :alt="event.title"
                class="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              >
            </div>
            <div class="mt-3 flex items-baseline justify-between">
              <h3 class="text-sm font-medium">
                {{ event.title }}
              </h3>
              <span class="text-xs text-muted">{{ event.count }} photos</span>
            </div>
            <p class="text-xs text-muted mt-0.5">
              {{ event.date }}
            </p>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section id="how-it-works" class="py-24 sm:py-32 border-t border-default">
      <div class="max-w-6xl mx-auto px-6 lg:px-8">
        <h2 class="text-sm font-medium uppercase tracking-widest text-muted mb-16">
          Comment ça marche
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
          <div v-for="step in steps" :key="step.number">
            <span class="text-xs text-muted">{{ step.number }}</span>
            <h3 class="text-xl font-light mt-2 mb-3">
              {{ step.title }}
            </h3>
            <p class="text-sm text-muted leading-relaxed">
              {{ step.description }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-24 sm:py-32 border-t border-default">
      <div class="max-w-6xl mx-auto px-6 lg:px-8 text-center">
        <h2 class="text-2xl sm:text-3xl font-light tracking-tight">
          Prêt à retrouver vos photos ?
        </h2>
        <p class="mt-4 text-sm text-muted max-w-md mx-auto">
          Des milliers de clichés de concours équestres vous attendent.
        </p>
        <UButton
          to="/concours"
          size="lg"
          color="neutral"
          variant="solid"
          class="mt-8"
        >
          Parcourir les concours
        </UButton>
      </div>
    </section>
  </div>
</template>
