<script setup lang="ts">
const route = useRoute()
const toast = useToast()
const id = route.params.id as string

const { data: collection, refresh } = await useFetch(`/api/collections/${id}`)

if (!collection.value) {
  throw createError({ statusCode: 404, message: 'Collection introuvable' })
}

const viewMode = ref<'gallery' | 'table'>('gallery')
const fileInput = ref<HTMLInputElement>()
const dragOver = ref(false)

const { refresh: refreshLazy } = useLazyImages()

watch(viewMode, () => refreshLazy())
watch(() => collection.value?.photos?.length, () => refreshLazy())

// Upload state
interface UploadItem {
  id: string
  name: string
  size: number
  progress: number
  speed: number
  status: 'pending' | 'uploading' | 'done' | 'duplicate' | 'error'
}

const uploadQueue = ref<UploadItem[]>([])
const isUploading = computed(() => uploadQueue.value.some((u: UploadItem) => u.status === 'uploading' || u.status === 'pending'))
const doneCount = computed(() => uploadQueue.value.filter((u: UploadItem) => u.status === 'done').length)

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

  for (const { file, item } of items) {
    try {
      await uploadFileXHR(file, item)
    } catch {
      // status already set to 'error' in XHR handler
    }
  }

  await refresh()
  refreshLazy()
}

function clearFinished() {
  uploadQueue.value = uploadQueue.value.filter((u: UploadItem) => u.status === 'pending' || u.status === 'uploading')
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
  } catch {
    toast.add({ title: 'Erreur lors de la suppression', color: 'error' })
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
            accept="image/*"
            class="hidden"
            @change="onFileSelect"
          >
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Upload queue -->
      <div v-if="uploadQueue.length" class="mx-6 mt-6">
        <div class="border border-default rounded-lg overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2.5 bg-elevated/50">
            <span class="text-xs font-medium">
              Uploads ({{ doneCount }}/{{ uploadQueue.length }})
            </span>
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
          <div class="divide-y divide-default max-h-60 overflow-y-auto">
            <div
              v-for="item in uploadQueue"
              :key="item.id"
              class="px-4 py-2.5 flex items-center gap-3"
            >
              <!-- Status icon -->
              <div class="shrink-0">
                <UIcon
                  v-if="item.status === 'done'"
                  name="i-lucide-check-circle"
                  class="size-4 text-green-500"
                />
                <UIcon
                  v-else-if="item.status === 'duplicate'"
                  name="i-lucide-copy"
                  class="size-4 text-amber-500"
                />
                <UIcon
                  v-else-if="item.status === 'error'"
                  name="i-lucide-alert-circle"
                  class="size-4 text-red-500"
                />
                <div
                  v-else-if="item.status === 'uploading'"
                  class="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin"
                />
                <UIcon
                  v-else
                  name="i-lucide-clock"
                  class="size-4 text-muted"
                />
              </div>

              <!-- File info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline justify-between gap-2">
                  <span class="text-xs truncate">{{ item.name }}</span>
                  <span
                    v-if="item.status === 'duplicate'"
                    class="text-[11px] text-amber-500 shrink-0"
                  >
                    Doublon
                  </span>
                  <div class="flex items-center gap-2 shrink-0">
                    <span
                      v-if="item.status === 'uploading' && item.speed > 0"
                      class="text-[11px] text-muted"
                    >
                      {{ formatSpeed(item.speed) }}
                    </span>
                    <span class="text-[11px] text-muted">
                      {{ formatSize(item.size) }}
                    </span>
                  </div>
                </div>

                <!-- Progress bar -->
                <div
                  v-if="item.status === 'uploading' || item.status === 'pending'"
                  class="mt-1.5 h-1 bg-elevated rounded-full overflow-hidden"
                >
                  <div
                    class="h-full bg-primary rounded-full transition-all duration-200"
                    :style="{ width: `${item.progress}%` }"
                  />
                </div>
              </div>

              <!-- Progress % -->
              <span
                v-if="item.status === 'uploading'"
                class="text-[11px] text-muted tabular-nums shrink-0 w-8 text-right"
              >
                {{ item.progress }}%
              </span>
            </div>
          </div>
        </div>
      </div>

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
      <div v-if="collection?.photos?.length" class="p-6">
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
</template>

<style scoped>
.lazy-img {
  opacity: 0;
  transition: opacity 0.3s ease;
}
.lazy-img[src] {
  opacity: 1;
}
</style>
