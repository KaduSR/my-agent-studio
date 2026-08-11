import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TOOL_PERMISSION,
  TOOLS,
  TOOL_CATEGORIES,
  TOOL_PERMISSIONS,
  getToolCategory,
  getToolDefinition,
  getToolPermission,
  isToolPermission,
} from '../../js/data/tools.js'
import { hasIcon } from '../../js/icons.js'
import { TEMPLATES } from '../../js/data/templates.js'

/** @param {ReadonlyArray<{ id: string }>} catalogue */
const ids = (catalogue) => catalogue.map((entry) => entry.id)

/**
 * Same reasoning as the template suite: a wrong id here does not throw, it
 * quietly renders a tool with no icon or one that no category ever shows.
 */
describe.each(TOOLS.map((tool) => [tool.id, tool]))('tool %s', (_id, tool) => {
  it('uses an icon that is actually bundled', () => {
    expect(hasIcon(tool.icon)).toBe(true)
  })

  it('belongs to a real category', () => {
    expect(ids(TOOL_CATEGORIES)).toContain(tool.category)
  })

  it('declares a permission the UI can offer', () => {
    expect(ids(TOOL_PERMISSIONS)).toContain(tool.defaultPermission)
  })

  it('carries the text the step needs', () => {
    expect(tool.name.length).toBeGreaterThan(0)
    expect(tool.description.length).toBeGreaterThan(10)
    expect(tool.defaultPurpose.length).toBeGreaterThan(10)
    expect(tool.suggestedRules.length).toBeGreaterThan(0)
  })
})

describe('the catalogue as a whole', () => {
  it('has unique ids', () => {
    expect(new Set(ids(TOOLS)).size).toBe(TOOLS.length)
  })

  it('leaves no category empty, which would render as a heading over nothing', () => {
    for (const category of TOOL_CATEGORIES) {
      expect(
        TOOLS.some((tool) => tool.category === category.id),
        category.id
      ).toBe(true)
    }
  })

  /**
   * Ids are permanent: templates and every saved agent refer to tools by id.
   * Renaming one would silently disable that tool for everyone who has it.
   */
  it('still contains every id the templates rely on', () => {
    for (const template of TEMPLATES) {
      for (const id of template.agent.tools) {
        expect(getToolDefinition(id), `${template.id} → ${id}`).toBeDefined()
      }
    }
  })

  it('defaults anything that writes or leaves the machine to asking first', () => {
    for (const id of ['terminal', 'files', 'email', 'api', 'secrets', 'ci-deploy']) {
      expect(getToolDefinition(id)?.defaultPermission, id).toBe('ask')
    }
    // Reading is the one case where interrupting the user buys nothing.
    expect(getToolDefinition('web-search')?.defaultPermission).toBe('auto')
    expect(getToolDefinition('database')?.defaultPermission).toBe('read-only')
  })
})

describe('lookup helpers', () => {
  it('finds by id and falls back safely', () => {
    expect(getToolCategory('research')?.label).toBe('Buscar e ler')
    expect(getToolCategory('nope')).toBeUndefined()
    expect(getToolPermission('auto').label).toBe('Usa sozinho')
    // An unknown permission must not blank the label out.
    expect(getToolPermission('inventada').id).toBe(DEFAULT_TOOL_PERMISSION)
    expect(getToolPermission(undefined).id).toBe(DEFAULT_TOOL_PERMISSION)
  })

  it('recognises only the three permissions', () => {
    expect(isToolPermission('ask')).toBe(true)
    expect(isToolPermission('auto')).toBe(true)
    expect(isToolPermission('read-only')).toBe(true)
    expect(isToolPermission('sudo')).toBe(false)
    expect(isToolPermission(undefined)).toBe(false)
  })
})
