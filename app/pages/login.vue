<script setup lang="ts">
import { z } from 'zod'

definePageMeta({
  layout: 'public'
})

const { loggedIn, fetch: fetchSession } = useUserSession()
const toast = useToast()

if (loggedIn.value) {
  await navigateTo('/dashboard')
}

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis')
})

const state = reactive({
  email: '',
  password: ''
})

const loading = ref(false)

async function onSubmit() {
  loading.value = true
  try {
    await $fetch('/api/admin/login', {
      method: 'POST',
      body: { email: state.email, password: state.password }
    })
    await fetchSession()
    await navigateTo('/dashboard')
  } catch {
    toast.add({
      title: 'Identifiants incorrects',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex-1 flex items-center justify-center py-24">
    <div class="w-full max-w-sm px-6">
      <div class="mb-10">
        <h1 class="text-2xl font-light tracking-tight">
          Connexion
        </h1>
        <p class="mt-2 text-sm text-muted">
          Espace administration Len-Art
        </p>
      </div>

      <UForm
        :schema="schema"
        :state="state"
        class="space-y-5"
        @submit="onSubmit"
      >
        <UFormField label="Email" name="email">
          <UInput
            v-model="state.email"
            type="email"
            placeholder="admin@lenart.fr"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Mot de passe" name="password">
          <UInput
            v-model="state.password"
            type="password"
            placeholder="Mot de passe"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UButton
          type="submit"
          color="neutral"
          size="lg"
          block
          :loading="loading"
        >
          Se connecter
        </UButton>
      </UForm>
    </div>
  </div>
</template>
