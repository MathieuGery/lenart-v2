import { useLocalStorage } from '@vueuse/core'

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

export const useCart = createSharedComposable(() => {
  const items = useLocalStorage<CartItem[]>('lenart-cart', [])
  const formula = useLocalStorage<CartFormula | null>('lenart-cart-formula', null)
  const isOpen = ref(false)

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
