import { describe, expect, it } from 'vitest'
import { TEMPLATES, getTemplate, isTemplateId } from '../../js/data/templates.js'
import { createAgentFromTemplate } from '../../js/agent/defaults.js'
import { DEFAULT_MEMORY_RESTRICTIONS } from '../../js/agent/defaults.js'
import { TONES, MAX_TONES } from '../../js/data/tones.js'
import { TRAITS, MAX_TRAITS } from '../../js/data/traits.js'
import { RESPONSE_STYLES } from '../../js/data/response-styles.js'
import { SOUL_VALUES } from '../../js/data/soul-values.js'
import { TOOLS } from '../../js/data/tools.js'
import { MEMORY_REMEMBER_OPTIONS, MEMORY_TYPES } from '../../js/data/memory.js'
import { validateAgent } from '../../js/agent/validate.js'

/**
 * @param {ReadonlyArray<{ id: string }>} catalogue
 * @returns {string[]}
 */
const ids = (catalogue) => catalogue.map((entry) => entry.id)

const SLIDER_KEYS = /** @type {const} */ ([
  'creativity',
  'precision',
  'formality',
  'proactivity',
  'detail',
  'autonomy',
])

/**
 * This is the important suite. A template that misspells an id does not throw —
 * the id simply matches nothing and the agent silently comes out with one fewer
 * tone or tool. These tests are what turn that into a build failure.
 */
describe.each(TEMPLATES.map((template) => [template.id, template]))(
  'template %s',
  (_id, template) => {
    it('references only tones that exist, within the SPEC 23 ceiling', () => {
      for (const tone of template.agent.personality.tones) {
        expect(ids(TONES)).toContain(tone)
      }
      expect(template.agent.personality.tones.length).toBeLessThanOrEqual(MAX_TONES)
    })

    it('references only traits that exist, within the SPEC 25 ceiling', () => {
      for (const trait of template.agent.personality.traits) {
        expect(ids(TRAITS)).toContain(trait)
      }
      expect(template.agent.personality.traits.length).toBeLessThanOrEqual(MAX_TRAITS)
    })

    it('uses a real response style', () => {
      expect(ids(RESPONSE_STYLES)).toContain(template.agent.personality.responseStyle)
    })

    it('uses real soul values', () => {
      for (const value of template.agent.soul.values) {
        expect(ids(SOUL_VALUES)).toContain(value)
      }
    })

    it('uses real tool ids and enables at least one', () => {
      expect(template.agent.tools.length).toBeGreaterThan(0)
      for (const tool of template.agent.tools) {
        expect(ids(TOOLS)).toContain(tool)
      }
    })

    it('uses a real memory type and real remember options', () => {
      expect(ids(MEMORY_TYPES)).toContain(template.agent.memory.type)
      for (const option of template.agent.memory.remember) {
        expect(ids(MEMORY_REMEMBER_OPTIONS)).toContain(option)
      }
    })

    it('keeps every slider inside 0-100', () => {
      const { personality } = template.agent
      for (const key of SLIDER_KEYS) {
        expect(personality[key]).toBeGreaterThanOrEqual(0)
        expect(personality[key]).toBeLessThanOrEqual(100)
      }
    })

    it('carries display metadata and non-trivial content', () => {
      expect(template.label.length).toBeGreaterThan(0)
      expect(template.emoji.length).toBeGreaterThan(0)
      expect(template.tagline.length).toBeGreaterThan(0)
      expect(template.agent.objective.length).toBeGreaterThan(40)
      expect(template.agent.soul.mission.length).toBeGreaterThan(0)
      expect(template.agent.guardRails.length).toBeGreaterThanOrEqual(4)
    })
  }
)

describe('createAgentFromTemplate', () => {
  it('produces an agent that passes full validation', () => {
    for (const template of TEMPLATES) {
      const result = validateAgent(createAgentFromTemplate(template.id))
      expect(result, template.id).toEqual({ ok: true, errors: {} })
    }
  })

  it('fills in every step, not just the header', () => {
    const agent = createAgentFromTemplate('sales-email')

    expect(agent.name).toBe('Redator de E-mails de Vendas')
    expect(agent.objective.length).toBeGreaterThan(40)
    expect(agent.soul.mission).not.toBe('')
    expect(agent.soul.essence).not.toBe('')
    expect(agent.soul.values.length).toBeGreaterThan(0)
    expect(agent.personality.tones.length).toBe(3)
    expect(agent.personality.responseStyle).toBe('clear-direct')
    expect(agent.guardRails.length).toBe(6)
    expect(agent.tools.filter((tool) => tool.enabled).length).toBe(2)
    expect(agent.memory.type).toBe('persistent')
    expect(agent.memory.remember.length).toBe(3)
  })

  it('keeps the whole tool catalogue so toggling does not lose configuration', () => {
    const agent = createAgentFromTemplate('dashboard-designer')
    expect(agent.tools).toHaveLength(TOOLS.length)
    expect(agent.tools.filter((tool) => tool.enabled).map((tool) => tool.id)).toEqual([
      'browser',
      'files',
      'code-execution',
      'image-generation',
    ])
  })

  it('mints fresh rule ids on every call', () => {
    const first = createAgentFromTemplate('sales-email')
    const second = createAgentFromTemplate('sales-email')

    const firstIds = first.guardRails.map((rule) => rule.id)
    expect(new Set(firstIds).size).toBe(firstIds.length)
    expect(firstIds).not.toEqual(second.guardRails.map((rule) => rule.id))
    expect(first.id).not.toBe(second.id)
  })

  it('numbers hard rules contiguously from zero', () => {
    const agent = createAgentFromTemplate('benchmark-research')
    expect(agent.guardRails.map((rule) => rule.order)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('adds template restrictions on top of the SPEC 77 defaults, never instead of them', () => {
    const agent = createAgentFromTemplate('sales-email')
    for (const restriction of DEFAULT_MEMORY_RESTRICTIONS) {
      expect(agent.memory.restrictions).toContain(restriction)
    }
    expect(agent.memory.restrictions).toContain(
      'Nunca armazenar dados de contato de prospects sem autorização.'
    )
  })

  it('leaves the defaults untouched for a template with no extra restrictions', () => {
    const agent = createAgentFromTemplate('dashboard-designer')
    expect(agent.memory.restrictions).toEqual([...DEFAULT_MEMORY_RESTRICTIONS])
  })

  it('rejects an unknown template loudly', () => {
    expect(() => createAgentFromTemplate('nope')).toThrow(/Unknown agent template/)
  })
})

describe('lookup helpers', () => {
  it('finds by id and reports membership', () => {
    expect(getTemplate('benchmark-research')?.label).toBe('Pesquisador de Benchmark')
    expect(getTemplate('nope')).toBeUndefined()
    expect(isTemplateId('sales-email')).toBe(true)
    expect(isTemplateId('sales-emails')).toBe(false)
  })

  it('has unique ids', () => {
    const all = TEMPLATES.map((template) => template.id)
    expect(new Set(all).size).toBe(all.length)
  })
})
