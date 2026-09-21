import { describe, it, expect, beforeAll } from 'vitest'
import { parseMarkdown } from '../src/vault/parser'
import { VaultDocument } from '../src/types'

describe('Vault Parser', () => {
  it('parses markdown with frontmatter', () => {
    const content = `---
title: Test Note
tags: [test, example]
confidentiality: internal
---

# Heading 1

Some content here.

[[Linked Note]]
#tag1 #tag2`

    const doc = parseMarkdown(
      content,
      '/path/to/test.md',
      'folder/test.md',
      'folder',
      Date.now(),
      Date.now(),
      content.length
    )

    expect(doc.title).toBe('Test Note')
    expect(doc.tags).toContain('tag1')
    expect(doc.confidentiality).toBe('internal')
    expect(doc.headings.length).toBeGreaterThan(0)
    expect(doc.links.length).toBeGreaterThan(0)
  })

  it('extracts wikilinks correctly', () => {
    const content = `[[Note 1]] and [[Note 2|alias]]`

    const doc = parseMarkdown(
      content,
      '/test.md',
      'test.md',
      '.',
      Date.now(),
      Date.now(),
      content.length
    )

    expect(doc.links.length).toBe(2)
    expect(doc.links[0].target).toBe('Note 1')
    expect(doc.links[1].alias).toBe('alias')
  })

  it('detects confidentiality levels', () => {
    const strict = `---
confidentiality: strict
---
Content`

    const doc = parseMarkdown(strict, '/t.md', 't.md', '.', Date.now(), Date.now(), strict.length)
    expect(doc.confidentiality).toBe('strict')
  })
})
