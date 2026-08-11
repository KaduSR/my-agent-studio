import { describe, expect, it } from 'vitest'
import {
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_LIBRARY,
  getKnowledgeCategory,
  getKnowledgeEntry,
  knowledgeInCategory,
} from '../../js/data/knowledge-library.js'
import { hasIcon } from '../../js/icons.js'
import { LIMITS } from '../../js/agent/validate.js'

/**
 * @param {ReadonlyArray<{ id: string }>} catalogue
 * @returns {string[]}
 */
const ids = (catalogue) => catalogue.map((entry) => entry.id)

/**
 * These entries are copied verbatim into agents and then into the exported
 * prompt, so a document over the ceiling would be silently truncated mid-sentence
 * by addKnowledgeFromLibrary rather than rejected.
 */
describe.each(KNOWLEDGE_LIBRARY.map((entry) => [entry.id, entry]))(
  'knowledge entry %s',
  (_id, entry) => {
    it('uses an icon that is actually bundled', () => {
      expect(hasIcon(entry.icon)).toBe(true)
    })

    it('belongs to a category that exists', () => {
      expect(ids(KNOWLEDGE_CATEGORIES)).toContain(entry.category)
    })

    it('fits the limits the store and the importer clamp against', () => {
      expect(entry.title.length).toBeGreaterThan(0)
      expect(entry.title.length).toBeLessThanOrEqual(LIMITS.knowledgeTitleMax)
      expect(entry.content.length).toBeGreaterThan(200)
      expect(entry.content.length).toBeLessThanOrEqual(LIMITS.knowledgeContentMax)
    })

    it('carries a one-line summary for the card', () => {
      expect(entry.summary.length).toBeGreaterThan(10)
      expect(entry.summary).not.toContain('\n')
    })

    it('opens with its own title as an h1, which the exporter then folds away', () => {
      expect(entry.content.startsWith(`# ${entry.title}`)).toBe(true)
    })

    it('is written as Markdown with real structure', () => {
      expect(entry.content).toMatch(/^##\s+\S/m)
    })
  }
)

describe('the catalogue as a whole', () => {
  it('has unique entry and category ids', () => {
    expect(new Set(ids(KNOWLEDGE_LIBRARY)).size).toBe(KNOWLEDGE_LIBRARY.length)
    expect(new Set(ids(KNOWLEDGE_CATEGORIES)).size).toBe(KNOWLEDGE_CATEGORIES.length)
  })

  it('leaves no category empty, since the step renders one heading each', () => {
    for (const category of KNOWLEDGE_CATEGORIES) {
      expect(knowledgeInCategory(category.id).length, category.id).toBeGreaterThan(0)
    }
  })

  it('offers more entries than an agent may hold, so the ceiling is a real choice', () => {
    expect(KNOWLEDGE_LIBRARY.length).toBeGreaterThanOrEqual(LIMITS.maxKnowledgeDocs)
  })

  it('uses distinct titles, so the exported file names do not all collide', () => {
    const titles = KNOWLEDGE_LIBRARY.map((entry) => entry.title)
    expect(new Set(titles).size).toBe(titles.length)
  })
})

describe('lookup helpers', () => {
  it('finds by id and is safe for an unknown one', () => {
    expect(getKnowledgeEntry('uncertainty')?.title).toBe('Lidar com incerteza')
    expect(getKnowledgeEntry('inventada')).toBeUndefined()
    expect(getKnowledgeCategory('safety')?.label).toBe('Segurança e limites')
    expect(getKnowledgeCategory('inventada')).toBeUndefined()
    expect(knowledgeInCategory('inventada')).toEqual([])
  })
})
