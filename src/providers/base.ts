import { ProviderRequest, ProviderResponse, VaultDocument } from '../types'

export interface ProviderConfig {
  apiKey: string
  model: string
  baseUrl?: string
}

export abstract class Provider {
  protected config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
  }

  abstract complete(request: ProviderRequest): Promise<ProviderResponse>

  protected formatContext(docs: VaultDocument[]): string {
    return docs
      .map(
        (doc) =>
          `<vault_document source="${doc.path}">
# ${doc.title}
${doc.content.slice(0, 2000)}
</vault_document>`
      )
      .join('\n\n')
  }

  protected estimateCost(tokensIn: number, tokensOut: number, modelCost: [number, number]): number {
    return (tokensIn * modelCost[0] + tokensOut * modelCost[1]) / 1_000_000
  }
}
