<script setup lang="ts">
const toast = useToast()

const { data: settings, refresh } = await useFetch<Record<string, string>>('/api/settings')

const jpegQuality = ref(Number(settings.value?.jpeg_quality ?? 95))
const maxFileSize = ref(Number(settings.value?.max_file_size_kb ?? 500))
const saving = ref(false)

async function save() {
  saving.value = true
  try {
    await $fetch('/api/settings', {
      method: 'PATCH',
      body: {
        jpeg_quality: String(jpegQuality.value),
        max_file_size_kb: String(maxFileSize.value)
      }
    })
    await refresh()
    toast.add({ title: 'Paramètres enregistrés', color: 'success' })
  } catch {
    toast.add({ title: 'Erreur lors de la sauvegarde', color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Paramètres">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-xl mx-auto p-6 space-y-8">
        <!-- Upload -->
        <div class="space-y-4">
          <div>
            <h2 class="text-sm font-medium">
              Upload des photos
            </h2>
            <p class="text-xs text-muted mt-1">
              Ces paramètres s'appliquent lors de l'upload de photos dans les collections.
            </p>
          </div>

          <div class="border border-default rounded-lg p-4 space-y-4">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-sm">Qualité JPEG</label>
                <span class="text-sm font-medium tabular-nums">{{ jpegQuality }}%</span>
              </div>
              <input
                v-model.number="jpegQuality"
                type="range"
                min="10"
                max="100"
                step="5"
                class="w-full h-1.5 accent-stone-600 cursor-pointer"
              >
              <p class="text-xs text-muted">
                Qualité de compression JPEG appliquée aux images uploadées. 100% = qualité maximale, fichiers plus lourds.
              </p>
            </div>

            <div class="border-t border-default pt-4 space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-sm">Taille maximale</label>
                <span class="text-sm font-medium tabular-nums">{{ maxFileSize }} Ko</span>
              </div>
              <input
                v-model.number="maxFileSize"
                type="range"
                min="50"
                max="500"
                step="10"
                class="w-full h-1.5 accent-stone-600 cursor-pointer"
              >
              <p class="text-xs text-muted">
                Taille maximale du fichier JPEG final. Si l'image dépasse cette limite, la qualité est réduite automatiquement.
              </p>
            </div>
          </div>
        </div>

        <div class="flex justify-end">
          <UButton :loading="saving" icon="i-lucide-save" @click="save">
            Enregistrer
          </UButton>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
