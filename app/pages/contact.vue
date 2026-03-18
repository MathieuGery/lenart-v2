<script setup lang="ts">
definePageMeta({ layout: 'public' })

const form = reactive({
  name: '',
  email: '',
  subject: '',
  message: ''
})

const loading = ref(false)
const sent = ref(false)
const error = ref<string | null>(null)

async function submit() {
  error.value = null
  loading.value = true
  try {
    await $fetch('/api/public/contact', {
      method: 'POST',
      body: form
    })
    sent.value = true
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } })?.data?.message ?? 'Une erreur est survenue, veuillez réessayer.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="py-20 sm:py-28">
    <div class="max-w-2xl mx-auto px-6 lg:px-8">
      <div class="mb-12">
        <h1 class="text-3xl sm:text-4xl font-light tracking-tight">
          Contact
        </h1>
        <p class="mt-3 text-sm text-muted max-w-md">
          Une question sur une photo, une commande ou un projet ? Écrivez moi, je vous répondrai dans les meilleurs délais.
        </p>
      </div>

      <!-- Success -->
      <template v-if="sent">
        <div class="flex items-start gap-4 rounded-lg border border-default p-6">
          <div class="size-9 rounded-full bg-green-500/15 flex items-center justify-center shrink-0 mt-0.5">
            <UIcon name="i-lucide-check" class="size-4 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 class="font-medium">
              Message envoyé !
            </h2>
            <p class="text-sm text-muted mt-1">
              Merci de nous avoir contactés. Nous reviendrons vers vous dès que possible à l'adresse <span class="text-highlighted">{{ form.email }}</span>.
            </p>
            <button
              type="button"
              class="mt-4 text-xs text-muted hover:text-highlighted transition-colors underline underline-offset-2"
              @click="sent = false; Object.assign(form, { name: '', email: '', subject: '', message: '' })"
            >
              Envoyer un autre message
            </button>
          </div>
        </div>
      </template>

      <!-- Form -->
      <form v-else class="space-y-5" @submit.prevent="submit">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div class="space-y-1.5">
            <label class="text-sm font-medium">Nom <span class="text-red-500">*</span></label>
            <UInput
              v-model="form.name"
              required
              placeholder="Jean Dupont"
              color="neutral"
              size="md"
              class="w-full"
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium">Adresse e-mail <span class="text-red-500">*</span></label>
            <UInput
              v-model="form.email"
              required
              type="email"
              placeholder="jean@example.com"
              color="neutral"
              size="md"
              class="w-full"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium">Sujet <span class="text-red-500">*</span></label>
          <UInput
            v-model="form.subject"
            required
            placeholder="Ex : Question sur une commande"
            color="neutral"
            size="md"
            class="w-full"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium">Message <span class="text-red-500">*</span></label>
          <UTextarea
            v-model="form.message"
            required
            :rows="6"
            placeholder="Votre message…"
            color="neutral"
            size="md"
            class="w-full"
          />
        </div>

        <p v-if="error" class="text-sm text-red-500">
          {{ error }}
        </p>

        <UButton
          type="submit"
          color="neutral"
          size="md"
          :loading="loading"
          :disabled="!form.name || !form.email || !form.subject || !form.message"
          trailing-icon="i-lucide-send"
        >
          Envoyer le message
        </UButton>
      </form>
    </div>
  </div>
</template>
