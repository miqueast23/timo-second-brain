import OpenAI from 'openai'
import { Provider, ProviderConfig } from './base'
import { ProviderRequest, ProviderResponse } from '../types'

export class OpenAIProvider extends Provider {
  private client: OpenAI

  constructor(apiKey: string, model: string = 'gpt-4o') {
    super({ apiKey, model })
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.openai.com/v1'
    })
  }

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    const contextStr = this.formatContext(request.context)

    const prompt = `You are an AI assistant analyzing documents from a personal knowledge base.

Context from Vault:
${contextStr}

Task: ${request.role}
Query: ${request.query}

Provide a detailed, well-reasoned response grounded in the provided context.`

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: 'You are a knowledgeable research assistant with access to a personal knowledge vault. Cite sources from the documents provided.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    const content = response.choices[0]?.message?.content || ''
    const tokensIn = response.usage?.prompt_tokens || 0
    const tokensOut = response.usage?.completion_tokens || 0

    // gpt-4o: $0.003 per 1K input, $0.006 per 1K output
    const cost = this.estimateCost(tokensIn, tokensOut, [0.003, 0.006])

    return {
      model: this.config.model,
      content,
      tokensIn,
      tokensOut,
      cost
    }
  }
}

export function createOpenAIProvider(apiKey?: string, model?: string): OpenAIProvider {
  const key = apiKey || process.env.OPENAI_API_KEY || ''
  const modelName = model || process.env.OPENAI_MODEL || 'gpt-4o'

  if (!key) {
    throw new Error('OPENAI_API_KEY not found')
  }

  return new OpenAIProvider(key, modelName)
}
