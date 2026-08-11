import { describe, expect, it } from 'vitest'
import {
  createAgentFromTemplate,
  createEmptyAgent,
  createKnowledgeDoc,
  duplicateAgent,
  DEFAULT_GUARD_RAILS,
  DEFAULT_MEMORY_RESTRICTIONS,
  DEFAULT_SLIDERS,
} from '../../js/agent/defaults.js'
import { TOOLS } from '../../js/data/tools.js'
import { SLIDER_IDS } from '../../js/data/behavior-sliders.js'
import { LIMITS } from '../../js/agent/validate.js'

describe('createEmptyAgent', () => {
  it('returns every slice populated, so nothing downstream has to defend itself', () => {
    const agent = createEmptyAgent()

    expect(agent.id).toBeTruthy()
    expect(agent.soul).toEqual({ mission: '', essence: '', philosophy: '', values: [] })
    expect(agent.personality).toMatchObject(DEFAULT_SLIDERS)
    expect(agent.personality.tones).toEqual([])
    expect(agent.guardRails.map((rule) => rule.text)).toEqual([...DEFAULT_GUARD_RAILS])
    expect(agent.tools).toHaveLength(TOOLS.length)
    expect(agent.knowledge).toEqual([])
    expect(agent.memory.restrictions).toEqual([...DEFAULT_MEMORY_RESTRICTIONS])
    for (const id of SLIDER_IDS) expect(typeof agent.personality[id], id).toBe('number')
  })

  it('mints a new identity per call', () => {
    expect(createEmptyAgent().id).not.toBe(createEmptyAgent().id)
  })

  it('lets an override win, which is how the importer and the revivers use it', () => {
    const agent = createEmptyAgent({ name: 'Vindo de fora', knowledge: [] })
    expect(agent.name).toBe('Vindo de fora')
    // The defaults it did not override are still there.
    expect(agent.tools).toHaveLength(TOOLS.length)
  })
})

describe('createKnowledgeDoc', () => {
  it('trims, so a catalogue copy and a hand-typed document are stored alike', () => {
    const doc = createKnowledgeDoc('  Nota  ', '  # Nota\n\nCorpo.\n', 3, 'clear-writing')
    expect(doc).toMatchObject({
      title: 'Nota',
      content: '# Nota\n\nCorpo.',
      order: 3,
      sourceId: 'clear-writing',
    })
    expect(doc.id).toBeTruthy()
  })

  it('leaves sourceId off entirely when the document is the user own', () => {
    expect('sourceId' in createKnowledgeDoc('Nota', 'Corpo.', 0)).toBe(false)
  })
})

describe('duplicateAgent', () => {
  const original = () => createAgentFromTemplate('customer-support')

  it('is a new agent, marked as a copy', () => {
    const source = original()
    const copy = duplicateAgent(source)

    expect(copy.id).not.toBe(source.id)
    expect(copy.name).toBe(`${source.name} — Cópia`)
    expect(copy.createdAt).not.toBe(source.createdAt)
  })

  it('carries everything the original had', () => {
    const source = original()
    const copy = duplicateAgent(source)

    expect(copy.objective).toBe(source.objective)
    expect(copy.soul).toEqual(source.soul)
    expect(copy.personality).toEqual(source.personality)
    expect(copy.memory).toEqual(source.memory)
    expect(copy.guardRails.map((rule) => rule.text)).toEqual(
      source.guardRails.map((rule) => rule.text)
    )
    expect(copy.tools.filter((tool) => tool.enabled).map((tool) => tool.id)).toEqual(
      source.tools.filter((tool) => tool.enabled).map((tool) => tool.id)
    )
    expect(copy.knowledge.map((doc) => doc.title)).toEqual(
      source.knowledge.map((doc) => doc.title)
    )
  })

  /**
   * Two agents sharing an id have nothing keeping them apart the moment anything
   * starts keying off it, which is why rules and documents are both re-minted.
   */
  it('mints fresh ids for rules and for knowledge documents', () => {
    const source = original()
    const copy = duplicateAgent(source)

    expect(source.knowledge.length).toBeGreaterThan(0)
    for (const [index, rule] of copy.guardRails.entries()) {
      expect(rule.id).not.toBe(source.guardRails[index].id)
    }
    for (const [index, doc] of copy.knowledge.entries()) {
      expect(doc.id, doc.title).not.toBe(source.knowledge[index].id)
    }
    expect(new Set(copy.knowledge.map((doc) => doc.id)).size).toBe(copy.knowledge.length)
  })

  it('keeps the order of the documents it copied', () => {
    const copy = duplicateAgent(original())
    expect(copy.knowledge.map((doc) => doc.order)).toEqual([0, 1, 2])
  })

  it('shares no mutable state with the original', () => {
    const source = original()
    const copy = duplicateAgent(source)

    copy.soul.values.push('inventado')
    copy.knowledge[0].content = 'reescrito'
    copy.guardRails[0].text = 'reescrito'
    copy.memory.restrictions.push('inventado')
    const tool = copy.tools.find((candidate) => candidate.enabled)
    if (tool) tool.purpose = 'reescrito'

    expect(source.soul.values).not.toContain('inventado')
    expect(source.knowledge[0].content).not.toBe('reescrito')
    expect(source.guardRails[0].text).not.toBe('reescrito')
    expect(source.memory.restrictions).not.toContain('inventado')
    expect(source.tools.find((candidate) => candidate.enabled)?.purpose).not.toBe('reescrito')
  })

  it('copies an agent with nothing on its knowledge shelf', () => {
    const source = createEmptyAgent({ name: 'Vazio' })
    expect(duplicateAgent(source).knowledge).toEqual([])
  })

  it('does not exceed the knowledge ceiling it started within', () => {
    const source = createEmptyAgent({
      name: 'Cheio',
      knowledge: Array.from({ length: LIMITS.maxKnowledgeDocs }, (_, index) =>
        createKnowledgeDoc(`Nota ${index}`, 'Corpo.', index)
      ),
    })
    expect(duplicateAgent(source).knowledge).toHaveLength(LIMITS.maxKnowledgeDocs)
  })
})
