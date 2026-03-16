<script setup lang="ts">
definePageMeta({ layout: 'public' })
</script>

<template>
  <div class="py-20 sm:py-28">
    <div class="max-w-md mx-auto px-6 lg:px-8 text-center">
      <div class="size-12 rounded-full bg-muted/10 flex items-center justify-center mx-auto mb-6">
        <UIcon name="i-lucide-x" class="size-6 text-muted" />
      </div>
      <h1 class="text-2xl font-light tracking-tight">
        Paiement annulé
      </h1>
      <p class="mt-3 text-sm text-muted">
        Vous avez annulé le paiement. Vos photos sont toujours dans votre panier.
      </p>
      <UButton class="mt-8" color="neutral" to="/concours">
        Retourner aux concours
      </UButton>
    </div>
  </div>
</template>
