<script setup lang="ts">
const toast = useToast()
const modalOpen = ref(false)
const newCollection = reactive({ name: '', description: '' })
const creating = ref(false)

const { data: collections, refresh } = await useFetch<CollectionListItem[]>('/api/collections')

async function createCollection() {
  if (!newCollection.name.trim()) return
  creating.value = true
  try {
    await $fetch('/api/collections', {
      method: 'POST',
      body: { name: newCollection.name, description: newCollection.description }
    })
    modalOpen.value = false
    newCollection.name = ''
    newCollection.description = ''
    await refresh()
  } catch {
    toast.add({ title: 'Erreur lors de la création', color: 'error' })
  } finally {
    creating.value = false
  }
}

async function toggleVisibility(collection: CollectionListItem) {
  try {
    await $fetch(`/api/collections/${collection.id}`, {
      method: 'PATCH',
      body: { visible: !collection.visible }
    })
    await refresh()
  } catch {
    toast.add({ title: 'Erreur lors de la mise à jour', color: 'error' })
  }
}

async function deleteCollection(id: string) {
  try {
    await $fetch(`/api/collections/${id}`, { method: 'DELETE' })
    await refresh()
    toast.add({ title: 'Collection supprimée' })
  } catch (err: any) {
    toast.add({ title: err?.data?.message || 'Erreur lors de la suppression', color: 'error' })
  }
}

const groupedCollections = computed(() => {
  if (!collections.value) return []
  const groups: Record<string, CollectionListItem[]> = {}
  for (const c of collections.value) {
    const key = new Date(c.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(c)
  }
  // Sort groups: most recent date first
  return Object.entries(groups).sort((a, b) => {
    const dateA = new Date(a[1][0].createdAt).getTime()
    const dateB = new Date(b[1][0].createdAt).getTime()
    return dateB - dateA
  })
})
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Collections">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-plus"
            size="sm"
            color="neutral"
            @click="modalOpen = true"
          >
            Nouvelle collection
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="!collections?.length" class="flex flex-col items-center justify-center py-24 text-center">
        <UIcon name="i-lucide-image" class="size-10 text-muted mb-4" />
        <p class="text-sm text-muted">
          Aucune collection pour le moment.
        </p>
        <UButton
          class="mt-4"
          color="neutral"
          size="sm"
          @click="modalOpen = true"
        >
          Créer une collection
        </UButton>
      </div>

      <div v-else class="p-6 space-y-8">
        <div
          v-for="[date, group] in groupedCollections"
          :key="date"
        >
          <h2 class="text-xs font-medium text-muted uppercase tracking-wider mb-3">
            {{ date }}
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="collection in group"
              :key="collection.id"
              class="border border-default rounded-lg p-4 hover:bg-elevated/50 transition-colors"
              :class="{ 'opacity-50': !collection.visible }"
            >
              <NuxtLink
                :to="`/dashboard/collections/${collection.id}`"
                class="block"
              >
                <div class="flex items-center gap-2">
                  <h3 class="font-medium text-sm">
                    {{ collection.name }}
                  </h3>
                  <UBadge v-if="!collection.visible" color="neutral" variant="subtle" size="xs">
                    Masquée
                  </UBadge>
                </div>
                <p
                  v-if="collection.description"
                  class="text-xs text-muted mt-1 line-clamp-2"
                >
                  {{ collection.description }}
                </p>
                <div class="mt-3">
                  <span class="text-xs text-muted">
                    {{ collection.photoCount }} photo{{ collection.photoCount !== 1 ? 's' : '' }}
                  </span>
                </div>
              </NuxtLink>
              <div class="mt-3 pt-3 border-t border-default flex justify-between">
                <UButton
                  :icon="collection.visible ? 'i-lucide-eye' : 'i-lucide-eye-off'"
                  :color="collection.visible ? 'neutral' : 'warning'"
                  variant="ghost"
                  size="xs"
                  @click="toggleVisibility(collection)"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="xs"
                  @click="deleteCollection(collection.id)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="modalOpen">
    <template #content>
      <div class="p-6">
        <h2 class="text-lg font-medium mb-4">
          Nouvelle collection
        </h2>
        <form class="space-y-4" @submit.prevent="createCollection">
          <UFormField label="Nom" required>
            <UInput
              v-model="newCollection.name"
              placeholder="Ex: CSO Lamotte-Beuvron 2026"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Description">
            <UTextarea
              v-model="newCollection.description"
              placeholder="Description optionnelle..."
              class="w-full"
            />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton
              variant="ghost"
              color="neutral"
              @click="modalOpen = false"
            >
              Annuler
            </UButton>
            <UButton
              type="submit"
              color="neutral"
              :loading="creating"
              :disabled="!newCollection.name.trim()"
            >
              Créer
            </UButton>
          </div>
        </form>
      </div>
    </template>
  </UModal>
</template>
