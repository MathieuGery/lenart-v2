<script setup lang="ts">
const toast = useToast()

const { data: allGalleries, refresh } = await useFetch<Gallery[]>('/api/galleries')

// ── Group by code ────────────────────────────────────────────────────────────
const grouped = computed(() => {
  if (!allGalleries.value) return []
  const map = new Map<string, Gallery[]>()
  for (const g of allGalleries.value) {
    const existing = map.get(g.code)
    if (existing) existing.push(g)
    else map.set(g.code, [g])
  }
  return [...map.entries()].map(([code, items]) => ({ code, items }))
})

// ── Modal ───────────────────────────────────────────────────────────────────
const modalOpen = ref(false)
const saving = ref(false)
const editingId = ref<string | null>(null)

const form = reactive({
  title: '',
  code: '',
  link: '',
  date: ''
})

function openCreate(prefillCode = '') {
  editingId.value = null
  form.title = ''
  form.code = prefillCode
  form.link = ''
  form.date = ''
  modalOpen.value = true
}

function openEdit(gallery: Gallery) {
  editingId.value = gallery.id
  form.title = gallery.title
  form.code = gallery.code
  form.link = gallery.link
  form.date = gallery.date ?? ''
  modalOpen.value = true
}

async function save() {
  saving.value = true
  try {
    const payload = {
      title: form.title,
      code: form.code,
      link: form.link,
      date: form.date || null
    }

    if (editingId.value) {
      await $fetch(`/api/galleries/${editingId.value}`, { method: 'PATCH', body: payload })
      toast.add({ title: 'Galerie mise à jour' })
    } else {
      await $fetch('/api/galleries', { method: 'POST', body: payload })
      toast.add({ title: 'Galerie créée' })
    }

    await refresh()
    modalOpen.value = false
  } catch {
    toast.add({ title: 'Erreur lors de la sauvegarde', color: 'error' })
  } finally {
    saving.value = false
  }
}

// ── Delete ──────────────────────────────────────────────────────────────────
const deleteConfirmId = ref<string | null>(null)
const deleting = ref(false)

async function confirmDelete() {
  if (!deleteConfirmId.value) return
  deleting.value = true
  try {
    await $fetch(`/api/galleries/${deleteConfirmId.value}`, { method: 'DELETE' })
    await refresh()
    deleteConfirmId.value = null
    toast.add({ title: 'Galerie supprimée' })
  } catch {
    toast.add({ title: 'Erreur lors de la suppression', color: 'error' })
  } finally {
    deleting.value = false
  }
}

function formatDate(date: string | null) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Galeries privées">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton icon="i-lucide-plus" color="neutral" size="sm" @click="openCreate()">
            Nouvelle galerie
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="!grouped.length" class="flex flex-col items-center justify-center py-24 text-center">
        <UIcon name="i-lucide-lock" class="size-10 text-muted mb-4" />
        <p class="text-sm text-muted">Aucune galerie privée pour le moment.</p>
      </div>

      <div v-else class="p-6 space-y-6">
        <div v-for="group in grouped" :key="group.code" class="border border-default rounded-lg overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 bg-elevated/30 border-b border-default">
            <div class="flex items-center gap-3">
              <span class="font-mono font-medium text-sm">{{ group.code }}</span>
              <UBadge color="neutral" variant="subtle" size="sm">
                {{ group.items.length }} galerie{{ group.items.length > 1 ? 's' : '' }}
              </UBadge>
            </div>
            <UButton
              icon="i-lucide-plus"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="openCreate(group.code)"
            />
          </div>

          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-default">
                <th class="text-left px-4 py-2 font-medium text-xs text-muted">Titre</th>
                <th class="text-left px-4 py-2 font-medium text-xs text-muted hidden md:table-cell">Date</th>
                <th class="text-left px-4 py-2 font-medium text-xs text-muted hidden lg:table-cell">Lien</th>
                <th class="w-20" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="gallery in group.items"
                :key="gallery.id"
                class="border-b border-default last:border-0 hover:bg-elevated/30 transition-colors"
              >
                <td class="px-4 py-3 font-medium">{{ gallery.title }}</td>
                <td class="px-4 py-3 text-muted hidden md:table-cell">
                  {{ formatDate(gallery.date) }}
                </td>
                <td class="px-4 py-3 hidden lg:table-cell">
                  <a
                    :href="gallery.link" target="_blank" rel="noopener"
                    class="text-muted hover:underline underline-offset-4 truncate block max-w-xs"
                  >
                    {{ gallery.link }}
                  </a>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-1">
                    <UButton
                      icon="i-lucide-pencil"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      square
                      @click="openEdit(gallery)"
                    />
                    <UButton
                      icon="i-lucide-trash-2"
                      color="error"
                      variant="ghost"
                      size="xs"
                      square
                      @click="deleteConfirmId = gallery.id"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Create / Edit modal -->
  <UModal v-model:open="modalOpen" :ui="{ content: 'max-w-lg' }">
    <template #content>
      <div class="p-6">
        <h2 class="text-base font-medium mb-5">
          {{ editingId ? 'Modifier la galerie' : 'Nouvelle galerie' }}
        </h2>

        <div class="space-y-4">
          <UFormField label="Titre">
            <UInput v-model="form.title" placeholder="Poney 50 cm" color="neutral" class="w-full" />
          </UFormField>

          <UFormField label="Code d'accès">
            <UInput v-model="form.code" placeholder="chv310324" color="neutral" class="w-full" />
            <p class="text-xs text-muted mt-1">
              Les galeries avec le même code seront regroupées.
            </p>
          </UFormField>

          <UFormField label="Lien externe">
            <UInput v-model="form.link" placeholder="https://www.amazon.fr/photos/share/..." color="neutral" class="w-full" />
          </UFormField>

          <UFormField label="Date (optionnel)">
            <UInput v-model="form.date" type="date" color="neutral" class="w-full" />
          </UFormField>
        </div>

        <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-default">
          <UButton color="neutral" variant="ghost" @click="modalOpen = false">Annuler</UButton>
          <UButton
            color="neutral"
            :loading="saving"
            :disabled="!form.title || !form.code || !form.link"
            @click="save()"
          >
            {{ editingId ? 'Enregistrer' : 'Créer' }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>

  <!-- Delete confirmation -->
  <UModal :open="!!deleteConfirmId" :ui="{ content: 'max-w-md' }" @update:open="!$event && (deleteConfirmId = null)">
    <template #content>
      <div class="p-6">
        <div class="flex items-start gap-4 mb-6">
          <div class="size-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-trash-2" class="size-5 text-red-500" />
          </div>
          <div>
            <h2 class="text-base font-medium mb-1">Supprimer la galerie</h2>
            <p class="text-sm text-muted">Cette action est irréversible.</p>
          </div>
        </div>
        <div class="flex justify-end gap-3 pt-4 border-t border-default">
          <UButton color="neutral" variant="ghost" @click="deleteConfirmId = null">Annuler</UButton>
          <UButton color="error" :loading="deleting" icon="i-lucide-trash-2" @click="confirmDelete()">
            Supprimer
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>