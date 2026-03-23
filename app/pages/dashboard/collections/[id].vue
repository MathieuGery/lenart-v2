<script setup lang="ts">
const route = useRoute()
const toast = useToast()
const id = route.params.id as string

const { data: collection, refresh } = await useFetch<CollectionDetail>(`/api/collections/${id}`)

if (!collection.value) {
  throw createError({ statusCode: 404, message: 'Collection introuvable' })
}

const viewMode = ref<'gallery' | 'table'>('gallery')
const fileInput = ref<HTMLInputElement>()
const dragOver = ref(false)

const { refresh: refreshLazy } = useLazyImages()

watch(viewMode, () => refreshLazy())
watch(() => collection.value?.photos?.length, () => refreshLazy())

// JPEG quality (from server settings)
const { data: appSettings } = await useFetch<Record<string, string>>('/api/settings')
const jpegQuality = computed(() => Number(appSettings.value?.jpeg_quality ?? 95))
const maxFileSizeKb = computed(() => Number(appSettings.value?.max_file_size_kb ?? 500))

// Upload state
interface UploadItem {
  id: string
  name: string
  size: number
  progress: number
  speed: number
  status: 'pending' | 'converting' | 'uploading' | 'done' | 'duplicate' | 'error'
}

const uploadQueue = ref<UploadItem[]>([])
const isUploading = computed(() => uploadQueue.value.some((u: UploadItem) => ['pending', 'converting', 'uploading'].includes(u.status)))
const doneCount = computed(() => uploadQueue.value.filter((u: UploadItem) => u.status === 'done').length)
const uploadPanelCollapsed = ref(false)

// Global progress: weighted by file size across all items
const globalProgress = computed(() => {
  const items = uploadQueue.value
  if (!items.length) return 0
  const totalSize = items.reduce((s, i) => s + i.size, 0)
  if (totalSize === 0) return 0
  const weightedProgress = items.reduce((s, i) => {
    const pct = ['done', 'duplicate'].includes(i.status) ? 100 : i.status === 'error' ? 0 : i.progress
    return s + (pct / 100) * i.size
  }, 0)
  return Math.round((weightedProgress / totalSize) * 100)
})

const globalSpeed = computed(() => {
  return uploadQueue.value
    .filter((i: UploadItem) => i.status === 'uploading')
    .reduce((s, i) => s + i.speed, 0)
})

function uploadFileXHR(file: File, item: UploadItem): Promise<void> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('files', file)

    const xhr = new XMLHttpRequest()
    let startTime = Date.now()
    let lastLoaded = 0

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        item.progress = Math.round((e.loaded / e.total) * 100)

        const now = Date.now()
        const elapsed = (now - startTime) / 1000
        if (elapsed > 0.2) {
          item.speed = (e.loaded - lastLoaded) / elapsed
          startTime = now
          lastLoaded = e.loaded
        }
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        item.progress = 100
        item.speed = 0
        try {
          const res = JSON.parse(xhr.responseText)
          item.status = res.duplicates?.length ? 'duplicate' : 'done'
        } catch {
          item.status = 'done'
        }
        resolve()
      } else {
        item.status = 'error'
        reject(new Error(`HTTP ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => {
      item.status = 'error'
      reject(new Error('Network error'))
    })

    xhr.open('POST', `/api/collections/${id}/photos`)
    item.status = 'uploading'
    xhr.send(formData)
  })
}

const CONCURRENCY = 5

async function processAndUpload(file: File, item: UploadItem) {
  try {
    item.status = 'converting'
    item.progress = 0
    const processed = await processImageFile(file, jpegQuality.value, maxFileSizeKb.value, (pct) => {
      item.progress = pct
    })
    item.name = processed.name
    item.size = processed.size
    item.progress = 0
    await uploadFileXHR(processed, item)
  } catch (e) {
    if (item.status !== 'error') item.status = 'error'
    if (e instanceof Error && !e.message.startsWith('HTTP') && !e.message.startsWith('Network')) {
      toast.add({ title: e.message, color: 'error' })
    }
  }
}

async function uploadFiles(files: FileList | File[]) {
  if (!files.length) return

  const items: { file: File, item: UploadItem }[] = []

  for (const file of files) {
    const item: UploadItem = reactive({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      progress: 0,
      speed: 0,
      status: 'pending'
    })
    uploadQueue.value.push(item)
    items.push({ file, item })
  }

  // Pool de workers : 5 conversions/uploads en parallèle
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++
      await processAndUpload(items[idx].file, items[idx].item)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker()))

  await refresh()
  refreshLazy()
}

function clearFinished() {
  uploadQueue.value = uploadQueue.value.filter((u: UploadItem) => ['pending', 'converting', 'uploading'].includes(u.status))
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) {
    uploadFiles(input.files)
    input.value = ''
  }
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  if (e.dataTransfer?.files) {
    uploadFiles(e.dataTransfer.files)
  }
}

async function deletePhoto(photoId: string) {
  try {
    await $fetch(`/api/photos/${photoId}`, { method: 'DELETE' })
    await refresh()
  } catch (err: any) {
    toast.add({ title: err?.data?.message || 'Erreur lors de la suppression', color: 'error' })
  }
}

const purgeModalOpen = ref(false)
const purging = ref(false)

async function purgeUnlinked() {
  purging.value = true
  try {
    const { deleted } = await $fetch<{ deleted: number }>(`/api/collections/${id}/purge`, { method: 'POST' })
    await refresh()
    purgeModalOpen.value = false
    if (deleted === 0) {
      toast.add({ title: 'Aucune photo à supprimer', color: 'neutral' })
    } else {
      toast.add({ title: `${deleted} photo${deleted !== 1 ? 's' : ''} supprimée${deleted !== 1 ? 's' : ''}`, color: 'success' })
    }
  } catch {
    toast.add({ title: 'Erreur lors de la purge', color: 'error' })
  } finally {
    purging.value = false
  }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function formatSpeed(bytesPerSec: number) {
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} o/s`
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(0)} Ko/s`
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} Mo/s`
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="collection?.name || 'Collection'">
        <template #leading>
          <UDashboardSidebarCollapse />
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="neutral"
            size="sm"
            square
            to="/dashboard/collections"
          />
        </template>
        <template #right>
          <div class="flex items-center gap-1 border border-default rounded-lg p-0.5">
            <UButton
              icon="i-lucide-grid-2x2"
              size="xs"
              square
              :variant="viewMode === 'gallery' ? 'solid' : 'ghost'"
              color="neutral"
              @click="viewMode = 'gallery'"
            />
            <UButton
              icon="i-lucide-list"
              size="xs"
              square
              :variant="viewMode === 'table' ? 'solid' : 'ghost'"
              color="neutral"
              @click="viewMode = 'table'"
            />
          </div>

          <UButton
            v-if="collection?.photos?.length"
            icon="i-lucide-trash-2"
            size="sm"
            color="error"
            variant="ghost"
            @click="purgeModalOpen = true"
          >
            Purger
          </UButton>
          <UButton
            icon="i-lucide-upload"
            size="sm"
            color="neutral"
            :loading="isUploading"
            @click="fileInput?.click()"
          >
            Ajouter des photos
          </UButton>
          <input
            ref="fileInput"
            type="file"
            multiple
            accept="image/*,.cr2,.cr3,.CR2,.CR3"
            class="hidden"
            @change="onFileSelect"
          >
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Empty state -->
      <div
        v-if="!collection?.photos?.length && !uploadQueue.length"
        class="flex flex-col items-center justify-center py-24 mx-6 my-6 border-2 border-dashed border-default rounded-lg transition-colors"
        :class="{ 'border-primary bg-primary/5': dragOver }"
        @dragover.prevent="dragOver = true"
        @dragleave="dragOver = false"
        @drop.prevent="onDrop"
      >
        <UIcon name="i-lucide-upload" class="size-10 text-muted mb-4" />
        <p class="text-sm text-muted">
          Glissez-déposez vos photos ici
        </p>
        <p class="text-xs text-muted mt-1">
          ou
        </p>
        <UButton
          class="mt-3"
          color="neutral"
          size="sm"
          @click="fileInput?.click()"
        >
          Parcourir les fichiers
        </UButton>
      </div>

      <!-- Photos -->
      <div v-if="collection?.photos?.length" class="p-6" :class="{ 'pb-40': uploadQueue.length }">
        <!-- Drop zone banner -->
        <div
          class="mb-6 border-2 border-dashed border-default rounded-lg p-4 text-center transition-colors"
          :class="{ 'border-primary bg-primary/5': dragOver }"
          @dragover.prevent="dragOver = true"
          @dragleave="dragOver = false"
          @drop.prevent="onDrop"
        >
          <p class="text-xs text-muted">
            Glissez-déposez pour ajouter des photos
          </p>
        </div>

        <!-- Gallery view -->
        <div
          v-if="viewMode === 'gallery'"
          class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
        >
          <div
            v-for="photo in collection.photos"
            :key="photo.id"
            class="group relative aspect-square overflow-hidden rounded-lg bg-elevated"
          >
            <img
              :data-src="photo.url"
              :alt="photo.filename"
              loading="lazy"
              class="size-full object-cover lazy-img"
            >
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-start justify-end p-2">
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="solid"
                size="xs"
                square
                class="opacity-0 group-hover:opacity-100 transition-opacity"
                @click="deletePhoto(photo.id)"
              />
            </div>
            <div class="absolute bottom-0 inset-x-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-linear-to-t from-black/50">
              <p class="text-xs text-white truncate">
                {{ photo.filename }}
              </p>
            </div>
          </div>
        </div>

        <!-- Table view -->
        <div v-else>
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-default text-left">
                <th class="pb-3 font-medium text-muted w-16" />
                <th class="pb-3 font-medium text-muted">
                  Nom
                </th>
                <th class="pb-3 font-medium text-muted">
                  Taille
                </th>
                <th class="pb-3 font-medium text-muted">
                  Date
                </th>
                <th class="pb-3 font-medium text-muted w-12" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="photo in collection.photos"
                :key="photo.id"
                class="border-b border-default last:border-0 group"
              >
                <td class="py-2 pr-3">
                  <div class="size-10 rounded overflow-hidden bg-elevated shrink-0">
                    <img
                      :data-src="photo.url"
                      :alt="photo.filename"
                      loading="lazy"
                      class="size-full object-cover lazy-img"
                    >
                  </div>
                </td>
                <td class="py-2">
                  <span class="truncate block max-w-xs">{{ photo.filename }}</span>
                </td>
                <td class="py-2 text-muted">
                  {{ formatSize(photo.size) }}
                </td>
                <td class="py-2 text-muted">
                  {{ new Date(photo.createdAt).toLocaleDateString('fr-FR') }}
                </td>
                <td class="py-2">
                  <UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    size="xs"
                    square
                    class="opacity-0 group-hover:opacity-100 transition-opacity"
                    @click="deletePhoto(photo.id)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Upload panel — fixed bottom -->
  <Transition name="upload-panel">
    <div
      v-if="uploadQueue.length"
      class="fixed bottom-0 right-0 left-(--sidebar-width,0px) z-40 border-t border-default bg-default shadow-lg"
    >
      <!-- Global progress bar -->
      <div class="h-1 bg-elevated">
        <div
          class="h-full bg-primary transition-all duration-300"
          :style="{ width: `${globalProgress}%` }"
        />
      </div>

      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-2">
        <div class="flex items-center gap-3">
          <div
            v-if="isUploading"
            class="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0"
          />
          <UIcon v-else name="i-lucide-check-circle" class="size-4 text-green-500 shrink-0" />
          <span class="text-xs font-medium">
            {{ isUploading ? 'Upload en cours' : 'Upload terminé' }}
            — {{ doneCount }}/{{ uploadQueue.length }} fichier{{ uploadQueue.length > 1 ? 's' : '' }}
          </span>
          <span v-if="isUploading" class="text-xs text-muted tabular-nums">
            {{ globalProgress }}%
          </span>
          <span v-if="isUploading && globalSpeed > 0" class="text-xs text-muted">
            · {{ formatSpeed(globalSpeed) }}
          </span>
        </div>
        <div class="flex items-center gap-1">
          <UButton
            :icon="uploadPanelCollapsed ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
            size="xs"
            variant="ghost"
            color="neutral"
            square
            @click="uploadPanelCollapsed = !uploadPanelCollapsed"
          />
          <UButton
            v-if="!isUploading"
            icon="i-lucide-x"
            size="xs"
            variant="ghost"
            color="neutral"
            square
            @click="clearFinished"
          />
        </div>
      </div>

      <!-- File list -->
      <div v-if="!uploadPanelCollapsed" class="divide-y divide-default max-h-52 overflow-y-auto">
        <div
          v-for="item in uploadQueue"
          :key="item.id"
          class="px-4 py-2 flex items-center gap-3"
        >
          <!-- Status icon -->
          <div class="shrink-0">
            <UIcon
              v-if="item.status === 'done'"
              name="i-lucide-check-circle"
              class="size-3.5 text-green-500"
            />
            <UIcon
              v-else-if="item.status === 'duplicate'"
              name="i-lucide-copy"
              class="size-3.5 text-amber-500"
            />
            <UIcon
              v-else-if="item.status === 'error'"
              name="i-lucide-alert-circle"
              class="size-3.5 text-red-500"
            />
            <div
              v-else-if="item.status === 'uploading' || item.status === 'converting'"
              class="size-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"
            />
            <UIcon
              v-else
              name="i-lucide-clock"
              class="size-3.5 text-muted"
            />
          </div>

          <!-- File info + progress -->
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline justify-between gap-2">
              <span class="text-xs truncate">{{ item.name }}</span>
              <div class="flex items-center gap-2 shrink-0">
                <span v-if="item.status === 'duplicate'" class="text-[11px] text-amber-500">Doublon</span>
                <span v-if="item.status === 'uploading' && item.speed > 0" class="text-[11px] text-muted">
                  {{ formatSpeed(item.speed) }}
                </span>
                <span class="text-[11px] text-muted">{{ formatSize(item.size) }}</span>
              </div>
            </div>
            <div
              v-if="item.status === 'converting' || item.status === 'uploading'"
              class="mt-1 h-1 bg-elevated rounded-full overflow-hidden"
            >
              <div
                class="h-full rounded-full transition-all duration-200"
                :class="item.status === 'converting' ? 'bg-amber-500' : 'bg-primary'"
                :style="{ width: `${item.progress}%` }"
              />
            </div>
            <p v-if="item.status === 'converting'" class="mt-0.5 text-[11px] text-amber-500">
              Conversion &amp; compression…
            </p>
          </div>

          <!-- Progress % -->
          <span
            v-if="item.status === 'converting' || item.status === 'uploading'"
            class="text-[11px] text-muted tabular-nums shrink-0 w-8 text-right"
          >
            {{ item.progress }}%
          </span>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Purge confirmation modal -->
  <UModal v-model:open="purgeModalOpen" :ui="{ content: 'max-w-md' }">
    <template #content>
      <div class="p-6">
        <div class="flex items-start gap-4 mb-6">
          <div class="size-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-trash-2" class="size-5 text-red-500" />
          </div>
          <div>
            <h2 class="text-base font-medium mb-1">
              Purger les photos non liées
            </h2>
            <p class="text-sm text-muted">
              Toutes les photos de cette collection qui ne sont rattachées à aucune commande seront définitivement supprimées. Cette action est irréversible.
            </p>
          </div>
        </div>
        <div class="flex justify-end gap-3 pt-4 border-t border-default">
          <UButton color="neutral" variant="ghost" @click="purgeModalOpen = false">
            Annuler
          </UButton>
          <UButton color="error" :loading="purging" icon="i-lucide-trash-2" @click="purgeUnlinked()">
            Purger quand même
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.lazy-img {
  opacity: 0;
  transition: opacity 0.3s ease;
}
.lazy-img[src] {
  opacity: 1;
}
.upload-panel-enter-active,
.upload-panel-leave-active {
  transition: transform 0.25s ease;
}
.upload-panel-enter-from,
.upload-panel-leave-to {
  transform: translateY(100%);
}
</style>
