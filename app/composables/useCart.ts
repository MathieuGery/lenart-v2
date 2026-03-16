import { useLocalStorage } from '@vueuse/core'

export interface CartItem {
  id: string
  filename: string
  url: string
  collectionId: string
  collectionName: string
}

export const useCart = createSharedComposable(() => {
  const items = useLocalStorage<CartItem[]>('lenart-cart', [])
  const isOpen = ref(false)

  const count = computed(() => items.value.length)

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
    } else {
      addToCart(item)
    }
  }

  function clearCart() {
    items.value = []
  }

  return { items, count, isOpen, isInCart, addToCart, removeFromCart, toggleCart, clearCart }
})
