import type { IntegrationProvider } from "@/lib/integrations/types"

const providers = new Map<string, IntegrationProvider>()

export function registerProvider(provider: IntegrationProvider) {
  providers.set(provider.id, provider)
}

export function getProvider(id: string): IntegrationProvider {
  const provider = providers.get(id)
  if (!provider) {
    throw new Error(`Unknown integration provider: ${id}`)
  }
  return provider
}
