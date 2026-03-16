export function useLazyImages(containerRef?: Ref<HTMLElement | null>) {
  let observer: IntersectionObserver | null = null

  function observe() {
    if (observer) observer.disconnect()

    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement
          const src = img.dataset.src
          if (src) {
            img.src = src
            delete img.dataset.src
          }
          observer?.unobserve(img)
        }
      }
    }, {
      rootMargin: '200px'
    })

    const root = containerRef?.value || document
    const images = root.querySelectorAll<HTMLImageElement>('img.lazy-img[data-src]')
    images.forEach(img => observer!.observe(img))
  }

  onMounted(() => observe())

  // Re-observe when DOM changes (new photos added, view switch)
  const refresh = () => nextTick(() => observe())

  onBeforeUnmount(() => {
    observer?.disconnect()
  })

  return { refresh }
}
