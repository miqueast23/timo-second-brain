import matter from 'gray-matter'
import { VaultDocument, Heading, Link, ConfidentialityLevel, AIAccessLevel } from '../types'
import { createHash } from 'crypto'

export function parseMarkdown(
  content: string,
  filePath: string,
  relativePath: string,
  folder: string,
  modified: number,
  created: number,
  size: number
): VaultDocument {
  const { data, content: bodyContent } = matter(content)

  const id = createHash('sha256').update(filePath).digest('hex').slice(0, 16)
  const title = data.title || relativePath.replace('.md', '').split('/').pop() || ''

  const headings = extractHeadings(bodyContent)
  const { links, tags } = extractMetadata(bodyContent)

  const confidentiality = (data.confidentiality || data.confidential) as ConfidentialityLevel | undefined
  const aiAccess = data.ai_access as AIAccessLevel | undefined

  return {
    id,
    path: relativePath,
    title,
    content: bodyContent,
    frontmatter: data,
    tags: tags,
    headings,
    links,
    backlinks: [],
    created: new Date(created),
    modified: new Date(modified),
    size,
    folder,
    confidentiality: confidentiality || 'internal',
    aiAccess: aiAccess || 'all'
  }
}

function extractHeadings(content: string): Heading[] {
  const headings: Heading[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      const text = match[2]
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')

      headings.push({ level, text, id })
    }
  }

  return headings
}

function extractMetadata(content: string): { links: Link[]; tags: string[] } {
  const links: Link[] = []
  const tags = new Set<string>()

  // Extract wikilinks [[note]] and [[note|alias]]
  const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
  let match
  while ((match = wikiLinkRegex.exec(content)) !== null) {
    links.push({
      source: '',
      target: match[1].trim(),
      type: 'wikilink',
      alias: match[2]?.trim()
    })
  }

  // Extract tags #tag
  const tagRegex = /#([a-zA-Z0-9_-]+)/g
  while ((match = tagRegex.exec(content)) !== null) {
    tags.add(match[1])
  }

  // Extract external links
  const externalRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  while ((match = externalRegex.exec(content)) !== null) {
    links.push({
      source: '',
      target: match[2],
      type: 'external',
      alias: match[1]
    })
  }

  return {
    links,
    tags: Array.from(tags)
  }
}

export function stripConfidentialData(content: string): string {
  // Spanish/Venezuelan patterns
  const patterns = [
    /\bV-\d{4,8}\b/g, // Venezuelan cedula
    /\bE-\d{4,8}\b/g, // Spanish cedula
    /\bJ-\d{4,8}\b/g, // Venezuelan RIF
    /\b\d{10,11}\b/g, // Phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Emails
    /sk-[A-Za-z0-9]{20,}/g, // API keys
    /xai-[A-Za-z0-9]{20,}/g, // xAI keys
    /sk-ant-[A-Za-z0-9]{20,}/g // Anthropic keys
  ]

  let result = content
  for (const pattern of patterns) {
    result = result.replace(pattern, '[REDACTED]')
  }

  return result
}
