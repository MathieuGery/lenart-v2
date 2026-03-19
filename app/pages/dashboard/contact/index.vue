<script setup lang="ts">
const toast = useToast()
const { data: messages, refresh } = await useFetch<ContactMessage[]>('/api/contact')

const STATUS_LABEL: Record<string, string> = {
  new: 'Nouveau',
  read: 'Lu',
  archived: 'Archivé'
}

const STATUS_COLOR: Record<string, 'info' | 'neutral' | 'warning'> = {
  new: 'info',
  read: 'neutral',
  archived: 'neutral'
}

const search = ref('')
const filterStatus = ref<string>('all')
const selected = ref<(typeof messages.value)[0] | null>(null)

const filtered = computed(() => {
  if (!messages.value) return []
  return messages.value.filter((m) => {
    const matchStatus = filterStatus.value === 'all' || m.status === filterStatus.value
    const q = search.value.trim().toLowerCase()
    const matchSearch = !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.subject.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })
})

const newCount = computed(() => messages.value?.filter(m => m.status === 'new').length ?? 0)

async function setStatus(id: string, status: string) {
  try {
    await $fetch(`/api/contact/${id}`, { method: 'PATCH', body: { status } })
    await refresh()
    if (selected.value?.id === id) {
      selected.value = messages.value?.find(m => m.id === id) ?? null
    }
  } catch {
    toast.add({ title: 'Erreur lors de la mise à jour', color: 'error' })
  }
}

async function openMessage(msg: NonNullable<typeof messages.value>[0]) {
  selected.value = msg
  if (msg.status === 'new') {
    await setStatus(msg.id, 'read')
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Messages">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UBadge v-if="newCount > 0" color="info" variant="subtle" size="sm">
            {{ newCount }} nouveau{{ newCount > 1 ? 'x' : '' }}
          </UBadge>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            size="sm"
            square
            @click="refresh()"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="!messages?.length" class="flex flex-col items-center justify-center py-24 text-center">
        <UIcon name="i-lucide-inbox" class="size-10 text-muted mb-4" />
        <p class="text-sm text-muted">
          Aucun message pour le moment.
        </p>
      </div>

      <div v-else class="flex h-full min-h-0">
        <!-- List -->
        <div class="w-full md:w-80 lg:w-96 shrink-0 border-r border-default flex flex-col" :class="selected ? 'hidden md:flex' : 'flex'">
          <!-- Filters -->
          <div class="p-3 border-b border-default space-y-2">
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Rechercher…"
              size="sm"
              color="neutral"
              class="w-full"
            />
            <div class="flex gap-1.5">
              <button
                v-for="opt in [{ value: 'all', label: 'Tous' }, { value: 'new', label: 'Nouveaux' }, { value: 'read', label: 'Lus' }, { value: 'archived', label: 'Archivés' }]"
                :key="opt.value"
                type="button"
                class="text-xs px-2.5 py-1 rounded-full border transition-colors"
                :class="filterStatus === opt.value
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-transparent'
                  : 'border-default text-muted hover:text-highlighted'"
                @click="filterStatus = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Message rows -->
          <div class="flex-1 overflow-y-auto divide-y divide-default">
            <button
              v-for="msg in filtered"
              :key="msg.id"
              type="button"
              class="w-full text-left px-4 py-3 hover:bg-elevated/40 transition-colors"
              :class="selected?.id === msg.id ? 'bg-elevated/60' : ''"
              @click="openMessage(msg)"
            >
              <div class="flex items-start justify-between gap-2 mb-1">
                <span class="text-sm font-medium truncate" :class="msg.status === 'new' ? '' : 'text-muted font-normal'">
                  {{ msg.name }}
                </span>
                <span class="text-xs text-muted shrink-0">
                  {{ new Date(msg.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) }}
                </span>
              </div>
              <p class="text-xs text-muted truncate">
                {{ msg.subject }}
              </p>
              <div class="flex items-center gap-2 mt-1.5">
                <UBadge
                  :color="STATUS_COLOR[msg.status] ?? 'neutral'"
                  variant="subtle"
                  size="xs"
                >
                  {{ STATUS_LABEL[msg.status] ?? msg.status }}
                </UBadge>
                <span v-if="msg.status === 'new'" class="size-1.5 rounded-full bg-blue-500 shrink-0" />
              </div>
            </button>

            <div v-if="!filtered.length" class="px-4 py-10 text-center text-sm text-muted">
              Aucun message.
            </div>
          </div>
        </div>

        <!-- Detail -->
        <div class="flex-1 flex flex-col min-w-0" :class="selected ? 'flex' : 'hidden md:flex'">
          <template v-if="selected">
            <!-- Detail header -->
            <div class="flex items-center gap-3 px-5 py-3 border-b border-default">
              <button
                type="button"
                class="md:hidden text-muted hover:text-highlighted transition-colors mr-1"
                @click="selected = null"
              >
                <UIcon name="i-lucide-arrow-left" class="size-4" />
              </button>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">
                  {{ selected.subject }}
                </p>
                <p class="text-xs text-muted truncate">
                  {{ selected.name }} — {{ selected.email }}
                </p>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <UButton
                  v-if="selected.status !== 'archived'"
                  icon="i-lucide-archive"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  title="Archiver"
                  @click="setStatus(selected.id, 'archived')"
                />
                <UButton
                  v-if="selected.status === 'archived'"
                  icon="i-lucide-inbox"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  title="Désarchiver"
                  @click="setStatus(selected.id, 'read')"
                />
              </div>
            </div>

            <!-- Message body -->
            <div class="flex-1 overflow-y-auto p-5 space-y-5">
              <div class="flex flex-wrap gap-4 text-sm">
                <div>
                  <span class="text-xs text-muted block mb-0.5">De</span>
                  <span>{{ selected.name }}</span>
                </div>
                <div>
                  <span class="text-xs text-muted block mb-0.5">E-mail</span>
                  <a :href="`mailto:${selected.email}`" class="hover:underline">{{ selected.email }}</a>
                </div>
                <div>
                  <span class="text-xs text-muted block mb-0.5">Reçu le</span>
                  <span>{{ new Date(selected.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</span>
                </div>
              </div>

              <div class="border-t border-default pt-5 whitespace-pre-wrap text-sm leading-relaxed">
                {{ selected.message }}
              </div>
            </div>

            <!-- Reply shortcut -->
            <div class="border-t border-default p-4">
              <UButton
                :to="`mailto:${selected.email}?subject=Re: ${selected.subject}`"
                color="neutral"
                variant="outline"
                size="sm"
                leading-icon="i-lucide-reply"
              >
                Répondre par e-mail
              </UButton>
            </div>
          </template>

          <!-- No selection -->
          <div v-else class="flex-1 flex items-center justify-center text-center px-6">
            <div>
              <UIcon name="i-lucide-mail" class="size-8 text-muted/30 mx-auto mb-3" />
              <p class="text-sm text-muted">
                Sélectionnez un message pour le lire.
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
