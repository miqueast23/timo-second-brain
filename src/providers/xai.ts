import OpenAI from 'openai'
import { Provider } from './base'
import { ProviderRequest, ProviderResponse } from '../types'

export class XAIProvider extends Provider {
  private client: OpenAI

  constructor(apiKey: string, model: string = 'grok-2-vision-12b') {
    super({ apiKey, model })
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.x.ai/v1'
    })
  }

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    const contextStr = this.formatContext(request.context)

    const systemPrompt =
      request.role === 'adversarial'
        ? 'You are a skilled adversarial analyst. Find weaknesses, inconsistencies, alternative interpretations, and risks in the arguments. Act as opposing counsel or a red team. Be direct and critical.'
        : 'You are a knowledgeable research assistant with access to a personal knowledge vault. Provide balanced analysis and cite sources.'

    const prompt = `You are analyzing documents from a personal knowledge base.

Context from Vault:
${contextStr}

Task: ${request.role}
Query: ${request.query}

${request.role === 'adversarial' ? 'Identify weaknesses, risks, alternative positions, and counterarguments.' : 'Provide detailed analysis grounded in the context.'}`

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 2000
    })

    const content = response.choices[0]?.message?.content || ''
    const tokensIn = response.usage?.prompt_tokens || 0
    const tokensOut = response.usage?.completion_tokens || 0

    // xAI/Grok: $0.005 per 1K input, $0.015 per 1K output
    const cost = this.estimateCost(tokensIn, tokensOut, [0.005, 0.015])

    return {
      model: this.config.model,
      content,
      tokensIn,
      tokensOut,
      cost
    }
  }
}

export function createXAIProvider(apiKey?: string, model?: string): XAIProvider {
  const key = apiKey || process.env.XAI_API_KEY || ''
  const modelName = model || process.env.XAI_MODEL || 'grok-2-vision-12b'

  if (!key) {
    throw new Error('XAI_API_KEY not found')
  }

  return new XAIProvider(key, modelName)
}
