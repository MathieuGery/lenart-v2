export interface CartItem {
  id: string
  filename: string
  url: string
  collectionId: string
  collectionName: string
}

export interface CartFormula {
  id: string
  name: string
  description: string | null
  basePriceCents: number
  digitalPhotosCount: number
  extraPhotoPriceCents: number | null
  isTourComplete: boolean
  printDetails: string | null
}

const ITEMS_KEY = 'lenart-cart'
const FORMULA_KEY = 'lenart-cart-formula'

function readLocal<T>(key: string, fallback: T): T {
  if (!import.meta.client) return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw || raw === 'null' || raw === 'undefined') return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeLocal(key: string, value: unknown) {
  if (!import.meta.client) return
  if (value == null) {
    localStorage.removeItem(key)
  } else {
    localStorage.setItem(key, JSON.stringify(value))
  }
}

export const useCart = createSharedComposable(() => {
  const items = ref<CartItem[]>(readLocal<CartItem[]>(ITEMS_KEY, []))
  const formula = ref<CartFormula | null>(readLocal<CartFormula | null>(FORMULA_KEY, null))
  const isOpen = ref(false)

  watch(items, v => writeLocal(ITEMS_KEY, v), { deep: true })
  watch(formula, v => writeLocal(FORMULA_KEY, v), { deep: true })

  const count = computed(() => items.value.length)

  const totalCents = computed(() => {
    if (!formula.value) return 0
    const extra = Math.max(0, count.value - formula.value.digitalPhotosCount)
    const extraCost = formula.value.extraPhotoPriceCents != null
      ? extra * formula.value.extraPhotoPriceCents
      : 0
    return formula.value.basePriceCents + extraCost
  })

  function canAddMore() {
    if (!formula.value) return false
    if (formula.value.isTourComplete) return false
    if (formula.value.extraPhotoPriceCents != null) return true
    return count.value < formula.value.digitalPhotosCount
  }

  function isInCart(id: string) {
    return items.value.some(i => i.id === id)
  }

  function addToCart(item: CartItem) {
    if (!isInCart(item.id)) {
      items.value = [...items.value, item]
    }
  }

  function removeFromCart(id: string) {
    items.value = items.value.filter(i => i.id !== id)
  }

  function toggleCart(item: CartItem) {
    if (isInCart(item.id)) {
      removeFromCart(item.id)
    } else if (canAddMore()) {
      addToCart(item)
    }
  }

  function setFormula(f: CartFormula) {
    formula.value = f
    items.value = []
  }

  function clearCart() {
    items.value = []
    formula.value = null
  }

  return {
    items,
    formula,
    count,
    totalCents,
    isOpen,
    isInCart,
    addToCart,
    removeFromCart,
    toggleCart,
    clearCart,
    setFormula,
    canAddMore
  }
})
