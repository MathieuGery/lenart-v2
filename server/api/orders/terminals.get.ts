export default defineEventHandler(async () => {
  const mollie = getMollie()
  const pages = await mollie.terminals.list({})

  const terminals = []
  for await (const page of pages) {
    const items = page.result?.embedded?.terminals ?? []
    terminals.push(...items)
  }

  return terminals
})
