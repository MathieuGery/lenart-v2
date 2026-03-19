<script setup lang="ts">
const toast = useToast()

const { data: settings, refresh } = await useFetch<Record<string, string>>('/api/settings')

const jpegQuality = ref(Number(settings.value?.jpeg_quality ?? 95))
const maxFileSize = ref(Number(settings.value?.max_file_size_kb ?? 500))
const photoPriceCents = ref(Number(settings.value?.photo_price_cents ?? 500))
const watermarkSize = ref(Number(settings.value?.watermark_size ?? 15))
const watermarkSpacing = ref(Number(settings.value?.watermark_spacing ?? 60))
const watermarkOpacity = ref(Number(settings.value?.watermark_opacity ?? 40))
const saving = ref(false)

// Watermark
const { data: watermarkData, refresh: refreshWatermark } = await useFetch<{ url: string | null }>('/api/settings/watermark')
const watermarkUrl = computed(() => watermarkData.value?.url ?? null)
const uploadingWatermark = ref(false)
const deletingWatermark = ref(false)

async function uploadWatermark(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploadingWatermark.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    await $fetch('/api/settings/watermark', { method: 'POST', body: formData })
    await refreshWatermark()
    toast.add({ title: 'Watermark uploadé', color: 'success' })
  } catch {
    toast.add({ title: 'Erreur lors de l\'upload', color: 'error' })
  } finally {
    uploadingWatermark.value = false
    input.value = ''
  }
}

async function deleteWatermark() {
  deletingWatermark.value = true
  try {
    await $fetch('/api/settings/watermark', { method: 'DELETE' })
    await refreshWatermark()
    toast.add({ title: 'Watermark supprimé', color: 'success' })
  } catch {
    toast.add({ title: 'Erreur lors de la suppression', color: 'error' })
  } finally {
    deletingWatermark.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await $fetch('/api/settings', {
      method: 'PATCH',
      body: {
        jpeg_quality: String(jpegQuality.value),
        max_file_size_kb: String(maxFileSize.value),
        photo_price_cents: String(photoPriceCents.value),
        watermark_size: String(watermarkSize.value),
        watermark_spacing: String(watermarkSpacing.value),
        watermark_opacity: String(watermarkOpacity.value)
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
        <!-- Tarification -->
        <div class="space-y-4">
          <div>
            <h2 class="text-sm font-medium">
              Tarification
            </h2>
            <p class="text-xs text-muted mt-1">
              Prix par défaut appliqué aux commandes sans formule.
            </p>
          </div>

          <div class="border border-default rounded-lg p-4 space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-sm">Prix par photo</label>
              <span class="text-sm font-medium tabular-nums">{{ (photoPriceCents / 100).toFixed(2) }} €</span>
            </div>
            <input
              v-model.number="photoPriceCents"
              type="range"
              min="50"
              max="5000"
              step="50"
              class="w-full h-1.5 accent-stone-600 cursor-pointer"
            >
            <p class="text-xs text-muted">
              Prix unitaire par photo en centimes. Utilisé quand aucune formule n'est sélectionnée.
            </p>
          </div>
        </div>

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

        <!-- Watermark -->
        <div class="space-y-4">
          <div>
            <h2 class="text-sm font-medium">
              Watermark
            </h2>
            <p class="text-xs text-muted mt-1">
              Image superposée au centre des photos uploadées. Utilisez un PNG avec transparence pour un meilleur rendu.
            </p>
          </div>

          <div class="border border-default rounded-lg p-4 space-y-4">
            <template v-if="watermarkUrl">
              <div class="flex items-center gap-4">
                <div class="w-32 h-32 border border-default rounded-lg flex items-center justify-center bg-[repeating-conic-gradient(#e5e5e5_0%_25%,transparent_0%_50%)] bg-size-[16px_16px]">
                  <img :src="watermarkUrl" alt="Watermark actuel" class="max-w-full max-h-full object-contain">
                </div>
                <div class="flex flex-col gap-2">
                  <label class="cursor-pointer">
                    <UButton as="span" variant="outline" icon="i-lucide-upload" :loading="uploadingWatermark" size="sm">
                      Remplacer
                    </UButton>
                    <input
                      type="file"
                      accept="image/png,image/webp,image/svg+xml"
                      class="hidden"
                      @change="uploadWatermark"
                    >
                  </label>
                  <UButton
                    variant="outline"
                    color="error"
                    icon="i-lucide-trash-2"
                    size="sm"
                    :loading="deletingWatermark"
                    @click="deleteWatermark"
                  >
                    Supprimer
                  </UButton>
                </div>
              </div>

              <div class="border-t border-default pt-4 space-y-4">
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="text-sm">Taille</label>
                  <span class="text-sm font-medium tabular-nums">{{ watermarkSize }}%</span>
                </div>
                <input
                  v-model.number="watermarkSize"
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  class="w-full h-1.5 accent-stone-600 cursor-pointer"
                >
                <p class="text-xs text-muted">
                  Taille du watermark par rapport à la largeur de l'image.
                </p>
              </div>

              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="text-sm">Espacement</label>
                  <span class="text-sm font-medium tabular-nums">{{ watermarkSpacing }}%</span>
                </div>
                <input
                  v-model.number="watermarkSpacing"
                  type="range"
                  min="0"
                  max="200"
                  step="10"
                  class="w-full h-1.5 accent-stone-600 cursor-pointer"
                >
                <p class="text-xs text-muted">
                  Espacement entre chaque watermark dans la grille (en % de la taille du watermark).
                </p>
              </div>

              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="text-sm">Opacité</label>
                  <span class="text-sm font-medium tabular-nums">{{ watermarkOpacity }}%</span>
                </div>
                <input
                  v-model.number="watermarkOpacity"
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  class="w-full h-1.5 accent-stone-600 cursor-pointer"
                >
                <p class="text-xs text-muted">
                  Opacité du watermark. 100% = totalement opaque.
                </p>
              </div>
              </div>
            </template>

            <div v-else class="flex flex-col items-center gap-3 py-4">
              <UIcon name="i-lucide-image-plus" class="text-2xl text-muted" />
              <p class="text-sm text-muted">
                Aucun watermark configuré
              </p>
              <label class="cursor-pointer">
                <UButton as="span" variant="outline" icon="i-lucide-upload" :loading="uploadingWatermark" size="sm">
                  Uploader un watermark
                </UButton>
                <input
                  type="file"
                  accept="image/png,image/webp,image/svg+xml"
                  class="hidden"
                  @change="uploadWatermark"
                >
              </label>
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
