<script setup lang="ts">
const toast = useToast()

const { data: promos, refresh } = await useFetch<PromoCode[]>('/api/promo-codes')
const { data: formulas } = await useFetch<PricingFormula[]>('/api/public/pricing')

// ── Modal ───────────────────────────────────────────────────────────────────
const modalOpen = ref(false)
const saving = ref(false)
const editingId = ref<string | null>(null)

const form = reactive({
  code: '',
  type: 'percentage' as 'percentage' | 'fixed',
  value: 10,
  maxUsage: 1,
  isActive: true,
  formulaId: null as string | null
})

function openCreate() {
  editingId.value = null
  form.code = ''
  form.type = 'percentage'
  form.value = 10
  form.maxUsage = 1
  form.isActive = true
  form.formulaId = null
  modalOpen.value = true
}

function openEdit(promo: PromoCode) {
  editingId.value = promo.id
  form.code = promo.code
  form.type = promo.type
  form.value = promo.value
  form.maxUsage = promo.maxUsage
  form.isActive = promo.isActive
  form.formulaId = promo.formulaId
  modalOpen.value = true
}

async function save() {
  saving.value = true
  try {
    const payload = {
      code: form.code,
      type: form.type,
      value: form.value,
      maxUsage: form.maxUsage,
      isActive: form.isActive,
      formulaId: form.formulaId
    }

    if (editingId.value) {
      await $fetch(`/api/promo-codes/${editingId.value}`, { method: 'PATCH', body: payload })
      toast.add({ title: 'Code promo mis à jour' })
    } else {
      await $fetch('/api/promo-codes', { method: 'POST', body: payload })
      toast.add({ title: 'Code promo créé' })
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
    await $fetch(`/api/promo-codes/${deleteConfirmId.value}`, { method: 'DELETE' })
    await refresh()
    deleteConfirmId.value = null
    toast.add({ title: 'Code promo supprimé' })
  } catch {
    toast.add({ title: 'Erreur lors de la suppression', color: 'error' })
  } finally {
    deleting.value = false
  }
}

function statusLabel(promo: PromoCode) {
  if (promo.usageCount >= promo.maxUsage) return 'Épuisé'
  return promo.isActive ? 'Actif' : 'Inactif'
}

function statusColor(promo: PromoCode): 'success' | 'error' | 'neutral' {
  if (promo.usageCount >= promo.maxUsage) return 'error'
  return promo.isActive ? 'success' : 'neutral'
}

function formatValue(promo: PromoCode) {
  if (promo.type === 'percentage') return `${promo.value}%`
  return `${(promo.value / 100).toFixed(2)} €`
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Codes promo">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton icon="i-lucide-plus" color="neutral" size="sm" @click="openCreate()">
            Nouveau code
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="!promos?.length" class="flex flex-col items-center justify-center py-24 text-center">
        <UIcon name="i-lucide-ticket-percent" class="size-10 text-muted mb-4" />
        <p class="text-sm text-muted">Aucun code promo pour le moment.</p>
      </div>

      <div v-else class="p-6">
        <div class="border border-default rounded-lg overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-default bg-elevated/30">
                <th class="text-left px-4 py-3 font-medium text-xs text-muted">Code</th>
                <th class="text-left px-4 py-3 font-medium text-xs text-muted">Type</th>
                <th class="text-left px-4 py-3 font-medium text-xs text-muted">Valeur</th>
                <th class="text-left px-4 py-3 font-medium text-xs text-muted">Utilisations</th>
                <th class="text-left px-4 py-3 font-medium text-xs text-muted hidden md:table-cell">Formule</th>
                <th class="text-left px-4 py-3 font-medium text-xs text-muted">Statut</th>
                <th class="w-20" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="promo in promos"
                :key="promo.id"
                class="border-b border-default last:border-0 hover:bg-elevated/30 transition-colors"
              >
                <td class="px-4 py-3">
                  <span class="font-mono font-medium">{{ promo.code }}</span>
                </td>
                <td class="px-4 py-3 text-muted">
                  {{ promo.type === 'percentage' ? 'Pourcentage' : 'Montant fixe' }}
                </td>
                <td class="px-4 py-3 font-medium">
                  {{ formatValue(promo) }}
                </td>
                <td class="px-4 py-3 tabular-nums">
                  {{ promo.usageCount }} / {{ promo.maxUsage }}
                </td>
                <td class="px-4 py-3 text-muted hidden md:table-cell">
                  {{ promo.formulaName ?? 'Toutes' }}
                </td>
                <td class="px-4 py-3">
                  <UBadge :color="statusColor(promo)" variant="subtle" size="sm">
                    {{ statusLabel(promo) }}
                  </UBadge>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-1">
                    <UButton
                      icon="i-lucide-pencil"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      square
                      @click="openEdit(promo)"
                    />
                    <UButton
                      icon="i-lucide-trash-2"
                      color="error"
                      variant="ghost"
                      size="xs"
                      square
                      @click="deleteConfirmId = promo.id"
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
          {{ editingId ? 'Modifier le code promo' : 'Nouveau code promo' }}
        </h2>

        <div class="space-y-4">
          <!-- Code -->
          <UFormField label="Code">
            <UInput v-model="form.code" placeholder="PROMO2025" color="neutral" class="w-full uppercase" />
          </UFormField>

          <!-- Type -->
          <div class="space-y-2">
            <p class="text-xs font-medium">Type de réduction</p>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="px-3 py-2 rounded-lg border-2 text-left text-sm transition-colors"
                :class="form.type === 'percentage' ? 'border-primary bg-primary/5' : 'border-default hover:border-muted'"
                @click="form.type = 'percentage'"
              >
                <p class="font-medium">Pourcentage</p>
                <p class="text-xs text-muted">Ex : -20%</p>
              </button>
              <button
                type="button"
                class="px-3 py-2 rounded-lg border-2 text-left text-sm transition-colors"
                :class="form.type === 'fixed' ? 'border-primary bg-primary/5' : 'border-default hover:border-muted'"
                @click="form.type = 'fixed'"
              >
                <p class="font-medium">Montant fixe</p>
                <p class="text-xs text-muted">Ex : -5,00 €</p>
              </button>
            </div>
          </div>

          <!-- Value -->
          <UFormField :label="form.type === 'percentage' ? 'Pourcentage (%)' : 'Montant (centimes)'">
            <UInput
              v-model.number="form.value"
              type="number"
              :min="1"
              :max="form.type === 'percentage' ? 100 : undefined"
              color="neutral"
              class="w-full"
            />
            <p class="text-xs text-muted mt-1">
              {{ form.type === 'percentage' ? `${form.value}% de réduction` : `${(form.value / 100).toFixed(2)} € de réduction` }}
            </p>
          </UFormField>

          <!-- Max usage -->
          <UFormField label="Nombre maximal d'utilisations">
            <UInput v-model.number="form.maxUsage" type="number" min="1" color="neutral" class="w-full" />
          </UFormField>

          <!-- Formula restriction -->
          <div class="space-y-2">
            <p class="text-xs font-medium">Limiter à une formule (optionnel)</p>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="px-3 py-2 rounded-lg border-2 text-left text-sm transition-colors"
                :class="!form.formulaId ? 'border-primary bg-primary/5' : 'border-default hover:border-muted'"
                @click="form.formulaId = null"
              >
                <p class="font-medium">Toutes</p>
                <p class="text-xs text-muted">Aucune restriction</p>
              </button>
              <button
                v-for="f in formulas"
                :key="f.id"
                type="button"
                class="px-3 py-2 rounded-lg border-2 text-left text-sm transition-colors"
                :class="form.formulaId === f.id ? 'border-primary bg-primary/5' : 'border-default hover:border-muted'"
                @click="form.formulaId = f.id"
              >
                <p class="font-medium">{{ f.name }}</p>
                <p class="text-xs text-muted">{{ (f.basePriceCents / 100).toFixed(2) }} €</p>
              </button>
            </div>
          </div>

          <!-- Active toggle -->
          <UFormField label="Actif">
            <USwitch v-model="form.isActive" color="neutral" />
          </UFormField>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-default">
          <UButton color="neutral" variant="ghost" @click="modalOpen = false">Annuler</UButton>
          <UButton color="neutral" :loading="saving" :disabled="!form.code" @click="save()">
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
            <h2 class="text-base font-medium mb-1">Supprimer le code promo</h2>
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
