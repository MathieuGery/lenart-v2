<script setup lang="ts">
const toast = useToast()

interface Feature {
  featureText: string
  displayOrder: number
}

interface Formula {
  id: string
  name: string
  description: string | null
  basePriceCents: number
  isFeatured: boolean
  digitalPhotosCount: number
  printDetails: string | null
  extraPhotoPriceCents: number | null
  isTourComplete: boolean
  isActive: boolean
  displayOrder: number
  features: Feature[]
}

const { data: formulas, refresh } = await useFetch<Formula[]>('/api/pricing')

// ── Modal ───────────────────────────────────────────────────────────────────
const modalOpen = ref(false)
const saving = ref(false)
const editingId = ref<string | null>(null)

const form = reactive({
  name: '',
  description: '',
  basePriceCents: 0,
  isFeatured: false,
  digitalPhotosCount: 0,
  printDetails: '',
  extraPhotoPriceCents: null as number | null,
  isTourComplete: false,
  isActive: true,
  displayOrder: 0
})

const featureInputs = ref<{ text: string }[]>([])

function addFeature() {
  featureInputs.value.push({ text: '' })
}

function removeFeature(i: number) {
  featureInputs.value.splice(i, 1)
}

function openCreate() {
  editingId.value = null
  form.name = ''
  form.description = ''
  form.basePriceCents = 0
  form.isFeatured = false
  form.digitalPhotosCount = 0
  form.printDetails = ''
  form.extraPhotoPriceCents = null
  form.isTourComplete = false
  form.isActive = true
  form.displayOrder = (formulas.value?.length ?? 0) + 1
  featureInputs.value = []
  modalOpen.value = true
}

function openEdit(formula: Formula) {
  editingId.value = formula.id
  form.name = formula.name
  form.description = formula.description ?? ''
  form.basePriceCents = formula.basePriceCents
  form.isFeatured = formula.isFeatured
  form.digitalPhotosCount = formula.digitalPhotosCount
  form.printDetails = formula.printDetails ?? ''
  form.extraPhotoPriceCents = formula.extraPhotoPriceCents
  form.isTourComplete = formula.isTourComplete
  form.isActive = formula.isActive
  form.displayOrder = formula.displayOrder
  featureInputs.value = formula.features.map(f => ({ text: f.featureText }))
  modalOpen.value = true
}

async function save() {
  saving.value = true
  try {
    const payload = {
      name: form.name,
      description: form.description || null,
      basePriceCents: form.basePriceCents,
      isFeatured: form.isFeatured,
      digitalPhotosCount: form.digitalPhotosCount,
      printDetails: form.printDetails || null,
      extraPhotoPriceCents: form.extraPhotoPriceCents,
      isTourComplete: form.isTourComplete,
      isActive: form.isActive,
      displayOrder: form.displayOrder,
      features: featureInputs.value
        .filter(f => f.text.trim())
        .map((f, i) => ({ featureText: f.text.trim(), displayOrder: i + 1 }))
    }

    if (editingId.value) {
      await $fetch(`/api/pricing/${editingId.value}`, { method: 'PATCH', body: payload })
      toast.add({ title: 'Formule mise à jour' })
    } else {
      await $fetch('/api/pricing', { method: 'POST', body: payload })
      toast.add({ title: 'Formule créée' })
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
    await $fetch(`/api/pricing/${deleteConfirmId.value}`, { method: 'DELETE' })
    await refresh()
    deleteConfirmId.value = null
    toast.add({ title: 'Formule supprimée' })
  } catch {
    toast.add({ title: 'Erreur lors de la suppression', color: 'error' })
  } finally {
    deleting.value = false
  }
}

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Tarifs">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton icon="i-lucide-plus" color="neutral" size="sm" @click="openCreate()">
            Nouvelle formule
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="!formulas?.length" class="flex flex-col items-center justify-center py-24 text-center">
        <UIcon name="i-lucide-tag" class="size-10 text-muted mb-4" />
        <p class="text-sm text-muted">Aucune formule de tarification.</p>
      </div>

      <div v-else class="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="formula in formulas"
          :key="formula.id"
          class="border border-default rounded-xl p-5 flex flex-col gap-3 relative"
          :class="!formula.isActive ? 'opacity-60' : ''"
        >
          <!-- Badges -->
          <div class="flex items-center gap-2 flex-wrap">
            <UBadge v-if="formula.isFeatured" color="warning" variant="subtle" size="xs">
              <UIcon name="i-lucide-star" class="size-3 mr-1" />Mise en avant
            </UBadge>
            <UBadge v-if="formula.isTourComplete" color="neutral" variant="subtle" size="xs">Tour complet</UBadge>
            <UBadge :color="formula.isActive ? 'success' : 'neutral'" variant="subtle" size="xs">
              {{ formula.isActive ? 'Active' : 'Inactive' }}
            </UBadge>
          </div>

          <!-- Name + price -->
          <div>
            <h3 class="font-semibold text-sm leading-tight">{{ formula.name }}</h3>
            <p v-if="formula.description" class="text-xs text-muted mt-0.5 line-clamp-2">{{ formula.description }}</p>
          </div>

          <div class="text-2xl font-bold">
            {{ formula.basePriceCents === 0 ? 'Sur devis' : formatPrice(formula.basePriceCents) }}
          </div>

          <!-- Details -->
          <div class="text-xs text-muted space-y-1">
            <p v-if="formula.digitalPhotosCount > 0">
              <UIcon name="i-lucide-image" class="size-3 inline mr-1" />
              {{ formula.isTourComplete ? 'Toutes les photos en numérique' : `${formula.digitalPhotosCount} photo${formula.digitalPhotosCount > 1 ? 's' : ''} numérique${formula.digitalPhotosCount > 1 ? 's' : ''}` }}
            </p>
            <p v-if="formula.printDetails">
              <UIcon name="i-lucide-printer" class="size-3 inline mr-1" />{{ formula.printDetails }}
            </p>
            <p v-if="formula.extraPhotoPriceCents">
              <UIcon name="i-lucide-plus-circle" class="size-3 inline mr-1" />+{{ formatPrice(formula.extraPhotoPriceCents) }} / photo supp.
            </p>
          </div>

          <!-- Features -->
          <ul v-if="formula.features.length" class="space-y-1 border-t border-default pt-3">
            <li
              v-for="feature in formula.features"
              :key="feature.displayOrder"
              class="flex items-start gap-1.5 text-xs"
            >
              <UIcon name="i-lucide-check" class="size-3.5 text-green-500 shrink-0 mt-0.5" />
              {{ feature.featureText }}
            </li>
          </ul>

          <!-- Actions -->
          <div class="flex items-center gap-2 mt-auto pt-3 border-t border-default">
            <UButton
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              size="xs"
              class="flex-1"
              @click="openEdit(formula)"
            >
              Modifier
            </UButton>
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              size="xs"
              square
              @click="deleteConfirmId = formula.id"
            />
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Create / Edit modal -->
  <UModal v-model:open="modalOpen" :ui="{ content: 'max-w-2xl' }">
    <template #content>
      <div class="p-6 max-h-[85vh] overflow-y-auto">
        <h2 class="text-base font-medium mb-5">
          {{ editingId ? 'Modifier la formule' : 'Nouvelle formule' }}
        </h2>

        <div class="space-y-4">
          <!-- Name + order -->
          <div class="grid grid-cols-3 gap-3">
            <UFormField label="Nom" class="col-span-2">
              <UInput v-model="form.name" placeholder="Formule PADDOCK" color="neutral" class="w-full" />
            </UFormField>
            <UFormField label="Ordre">
              <UInput v-model.number="form.displayOrder" type="number" min="0" color="neutral" class="w-full" />
            </UFormField>
          </div>

          <!-- Description -->
          <UFormField label="Description">
            <UInput v-model="form.description" placeholder="Description courte…" color="neutral" class="w-full" />
          </UFormField>

          <!-- Prices -->
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Prix de base (centimes)">
              <UInput v-model.number="form.basePriceCents" type="number" min="0" placeholder="800" color="neutral" class="w-full" />
              <p class="text-xs text-muted mt-1">{{ formatPrice(form.basePriceCents) }}</p>
            </UFormField>
            <UFormField label="Prix photo supp. (centimes, optionnel)">
              <UInput
                :model-value="form.extraPhotoPriceCents ?? ''"
                type="number"
                min="0"
                placeholder="500"
                color="neutral"
                class="w-full"
                @update:model-value="form.extraPhotoPriceCents = $event === '' ? null : Number($event)"
              />
              <p v-if="form.extraPhotoPriceCents" class="text-xs text-muted mt-1">{{ formatPrice(form.extraPhotoPriceCents) }}</p>
            </UFormField>
          </div>

          <!-- Counts -->
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Photos numériques incluses">
              <UInput v-model.number="form.digitalPhotosCount" type="number" min="0" color="neutral" class="w-full" />
            </UFormField>
            <UFormField label="Détail impression (optionnel)">
              <UInput v-model="form.printDetails" placeholder="1 impression 10x15cm" color="neutral" class="w-full" />
            </UFormField>
          </div>

          <!-- Toggles -->
          <div class="grid grid-cols-3 gap-4 pt-1">
            <UFormField label="Active">
              <USwitch v-model="form.isActive" color="neutral" />
            </UFormField>
            <UFormField label="Mise en avant">
              <USwitch v-model="form.isFeatured" color="neutral" />
            </UFormField>
            <UFormField label="Tour complet">
              <USwitch v-model="form.isTourComplete" color="neutral" />
            </UFormField>
          </div>

          <!-- Features -->
          <div class="border-t border-default pt-4">
            <div class="flex items-center justify-between mb-3">
              <p class="text-sm font-medium">Inclus dans la formule</p>
              <UButton icon="i-lucide-plus" color="neutral" variant="ghost" size="xs" @click="addFeature()">
                Ajouter
              </UButton>
            </div>
            <div v-if="!featureInputs.length" class="text-xs text-muted py-2">
              Aucun élément. Cliquez sur « Ajouter » pour en créer.
            </div>
            <div class="space-y-2">
              <div
                v-for="(feat, i) in featureInputs"
                :key="i"
                class="flex items-center gap-2"
              >
                <UInput
                  v-model="feat.text"
                  :placeholder="`Élément ${i + 1}`"
                  color="neutral"
                  size="sm"
                  class="flex-1"
                />
                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  @click="removeFeature(i)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-default">
          <UButton color="neutral" variant="ghost" @click="modalOpen = false">Annuler</UButton>
          <UButton color="neutral" :loading="saving" :disabled="!form.name" @click="save()">
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
            <h2 class="text-base font-medium mb-1">Supprimer la formule</h2>
            <p class="text-sm text-muted">Cette action est irréversible. La formule et ses éléments seront définitivement supprimés.</p>
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
