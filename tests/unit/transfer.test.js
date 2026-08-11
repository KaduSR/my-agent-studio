import { describe, expect, it } from 'vitest'
import {
  agentFromJson,
  parseAgentJson,
  serializeAgent,
  TRANSFER_KIND,
} from '../../js/agent/transfer.js'
import { generateConfigJson } from '../../js/agent/files.js'
import { createAgentFromTemplate, createEmptyAgent } from '../../js/agent/defaults.js'
import { TOOLS } from '../../js/data/tools.js'
import { MAX_TONES } from '../../js/data/tones.js'
import { LIMITS } from '../../js/agent/validate.js'

const starter = () => createAgentFromTemplate('sales-email')

describe('serializeAgent', () => {
  it('wraps the agent with something a reader can identify', () => {
    const parsed = JSON.parse(serializeAgent(starter()))

    expect(parsed.kind).toBe(TRANSFER_KIND)
    expect(parsed.version).toBe(1)
    expect(typeof parsed.exportedAt).toBe('string')
    expect(parsed.agent.name).toBe('Redator de E-mails de Vendas')
  })
})

describe('round trip', () => {
  /**
   * The whole point of this file existing next to config.json: everything the
   * builder can edit has to survive the trip.
   */
  it('preserves every step', () => {
    const original = starter()
    const restored = parseAgentJson(serializeAgent(original))

    expect(restored.name).toBe(original.name)
    expect(restored.description).toBe(original.description)
    expect(restored.objective).toBe(original.objective)
    expect(restored.avatarId).toBe(original.avatarId)
    expect(restored.soul).toEqual(original.soul)
    expect(restored.personality).toEqual(original.personality)
    expect(restored.memory).toEqual(original.memory)
    expect(restored.guardRails.map((rule) => rule.text)).toEqual(
      original.guardRails.map((rule) => rule.text)
    )
    expect(restored.tools.filter((tool) => tool.enabled).map((tool) => tool.id)).toEqual(
      original.tools.filter((tool) => tool.enabled).map((tool) => tool.id)
    )
  })

  it('keeps disabled tools, which config.json cannot', () => {
    const restored = parseAgentJson(serializeAgent(starter()))
    expect(restored.tools).toHaveLength(TOOLS.length)
  })

  it('brings back per-tool permission and a custom tool', () => {
    const original = starter()
    const withExtras = {
      ...original,
      tools: [
        ...original.tools.map((tool) =>
          tool.id === 'web-search' ? { ...tool, permission: /** @type {const} */ ('read-only') } : tool
        ),
        {
          id: 'custom-mcp-do-time',
          name: 'MCP do time',
          enabled: true,
          custom: true,
          permission: /** @type {const} */ ('ask'),
          description: 'Catálogo interno.',
          purpose: 'Consultar produtos.',
        },
      ],
    }

    const restored = parseAgentJson(serializeAgent(withExtras))

    expect(restored.tools.find((tool) => tool.id === 'web-search')?.permission).toBe('read-only')
    const custom = restored.tools.find((tool) => tool.id === 'custom-mcp-do-time')
    expect(custom?.custom).toBe(true)
    expect(custom?.enabled).toBe(true)
    expect(custom?.purpose).toBe('Consultar produtos.')
    expect(custom?.description).toBe('Catálogo interno.')
  })

  it('keeps every slider, including the three added after the first release', () => {
    const original = starter()
    const restored = parseAgentJson(
      serializeAgent({
        ...original,
        personality: { ...original.personality, humor: 90, technicality: 10, uncertainty: 35 },
      })
    )

    expect(restored.personality.humor).toBe(90)
    expect(restored.personality.technicality).toBe(10)
    expect(restored.personality.uncertainty).toBe(35)
  })

  it('gives a file written before those sliders existed their defaults', () => {
    const agent = agentFromJson({ name: 'Antigo', personality: { creativity: 20 } })
    expect(agent.personality.creativity).toBe(20)
    expect(agent.personality.humor).toBe(createEmptyAgent().personality.humor)
    expect(agent.personality.uncertainty).toBe(createEmptyAgent().personality.uncertainty)
  })

  it('mints a new identity, so re-importing never overwrites the original', () => {
    const original = starter()
    const restored = parseAgentJson(serializeAgent(original))

    expect(restored.id).not.toBe(original.id)
    expect(restored.guardRails.map((rule) => rule.id)).not.toEqual(
      original.guardRails.map((rule) => rule.id)
    )
  })

  it('numbers rules contiguously from zero, whatever the file claimed', () => {
    const restored = agentFromJson({
      name: 'Teste',
      guardRails: [
        { id: 'a', text: 'Primeira', order: 9 },
        { id: 'b', text: 'Segunda', order: 4 },
      ],
    })

    expect(restored.guardRails.map((rule) => rule.order)).toEqual([0, 1])
    expect(restored.guardRails.map((rule) => rule.text)).toEqual(['Primeira', 'Segunda'])
  })
})

describe('reading foreign shapes', () => {
  it('accepts a bare agent object, with no wrapper', () => {
    const agent = parseAgentJson(JSON.stringify(starter()))
    expect(agent.name).toBe('Redator de E-mails de Vendas')
  })

  it('accepts the config.json we export, flattened as it is', () => {
    const agent = parseAgentJson(generateConfigJson(starter()))

    expect(agent.name).toBe('Redator de E-mails de Vendas')
    // config.json writes rules as plain strings and only the enabled tools.
    expect(agent.guardRails.length).toBeGreaterThan(0)
    expect(agent.tools.filter((tool) => tool.enabled).map((tool) => tool.id)).toEqual([
      'web-search',
      'email',
    ])
    expect(agent.personality.tones).toEqual(['consultative', 'direct', 'professional'])
  })

  it('reads a template-style list of tool ids', () => {
    const agent = agentFromJson({ name: 'Teste', tools: ['files', 'terminal'] })
    expect(agent.tools.filter((tool) => tool.enabled).map((tool) => tool.id)).toEqual([
      'files',
      'terminal',
    ])
  })

  it('still finds the rules of an agent saved before the Guard Rails rename', () => {
    const agent = agentFromJson({ name: 'Teste', hardRules: ['Nunca minta.'] })
    expect(agent.guardRails.map((rule) => rule.text)).toEqual(['Nunca minta.'])
  })
})

describe('coercion', () => {
  it('drops ids that no longer exist in the catalogues', () => {
    const agent = agentFromJson({
      name: 'Teste',
      soul: { values: ['clarity', 'inventado'] },
      personality: { tones: ['direct', 'gritado'], traits: ['precise', 'nope'], responseStyle: 'x' },
      memory: { type: 'telepática', remember: ['projects', 'sonhos'] },
      tools: [{ id: 'fantasma', enabled: true }],
      avatarId: 'nao-existe',
    })

    expect(agent.soul.values).toEqual(['clarity'])
    expect(agent.personality.tones).toEqual(['direct'])
    expect(agent.personality.traits).toEqual(['precise'])
    expect(agent.personality.responseStyle).toBe('')
    expect(agent.memory.type).toBe(createEmptyAgent().memory.type)
    expect(agent.memory.remember).toEqual(['projects'])
    expect(agent.tools.every((tool) => !tool.enabled)).toBe(true)
    expect(agent.avatarId).toBe(createEmptyAgent().avatarId)
  })

  it('honours the selection ceilings even when the file ignores them', () => {
    const agent = agentFromJson({
      name: 'Teste',
      personality: { tones: ['friendly', 'didactic', 'direct', 'calm', 'objective'] },
    })

    expect(agent.personality.tones).toHaveLength(MAX_TONES)
  })

  it('clamps sliders and falls back when they are not numbers', () => {
    const agent = agentFromJson({
      name: 'Teste',
      personality: { creativity: 480, precision: -20, formality: 'muito' },
    })

    expect(agent.personality.creativity).toBe(100)
    expect(agent.personality.precision).toBe(0)
    expect(agent.personality.formality).toBe(createEmptyAgent().personality.formality)
  })

  it('truncates text instead of importing a field no input could hold', () => {
    const agent = agentFromJson({ name: 'n'.repeat(500), objective: 'o'.repeat(900) })

    expect(agent.name).toHaveLength(LIMITS.nameMax)
    expect(agent.objective).toHaveLength(LIMITS.objectiveMax)
  })

  it('keeps the SPEC 77 memory restrictions when the file has none', () => {
    const agent = agentFromJson({ name: 'Teste' })
    expect(agent.memory.restrictions).toEqual(createEmptyAgent().memory.restrictions)
  })
})

describe('rejection', () => {
  it('explains that the file is not JSON', () => {
    expect(() => parseAgentJson('{ isto não é json')).toThrow(/não é um JSON válido/)
  })

  it('refuses JSON that describes something else entirely', () => {
    expect(() => parseAgentJson('{"pedido": 42}')).toThrow(/não descreve um agente/)
    expect(() => parseAgentJson('[1, 2, 3]')).toThrow(/não descreve um agente/)
  })
})

describe('knowledge', () => {
  it('round-trips documents, with fresh ids and contiguous order', () => {
    const agent = starter()
    const back = agentFromJson(JSON.parse(serializeAgent(agent)).agent)

    expect(back.knowledge.map((doc) => doc.title)).toEqual(
      agent.knowledge.map((doc) => doc.title)
    )
    expect(back.knowledge.map((doc) => doc.content)).toEqual(
      agent.knowledge.map((doc) => doc.content)
    )
    expect(back.knowledge.map((doc) => doc.order)).toEqual([0, 1, 2])
    // Importing is creating, so nothing may share an id with the source.
    for (const [index, doc] of back.knowledge.entries()) {
      expect(doc.id).not.toBe(agent.knowledge[index].id)
    }
  })

  it('reads a file written before the step existed as an empty shelf', () => {
    const { knowledge, ...withoutKnowledge } = starter()
    expect(knowledge.length).toBeGreaterThan(0)
    expect(agentFromJson(withoutKnowledge).knowledge).toEqual([])
  })

  it('identifies a file that carries only knowledge as an agent', () => {
    const agent = parseAgentJson(
      JSON.stringify({ knowledge: [{ title: 'Nota', content: 'Conteúdo.' }] })
    )
    expect(agent.knowledge).toHaveLength(1)
  })

  it('clamps long text and caps the number of documents', () => {
    const agent = agentFromJson({
      knowledge: Array.from({ length: LIMITS.maxKnowledgeDocs + 6 }, (_, index) => ({
        title: `T${index}`.padEnd(LIMITS.knowledgeTitleMax + 30, 'x'),
        content: 'c'.repeat(LIMITS.knowledgeContentMax + 400),
      })),
    })

    expect(agent.knowledge).toHaveLength(LIMITS.maxKnowledgeDocs)
    for (const doc of agent.knowledge) {
      expect(doc.title.length).toBeLessThanOrEqual(LIMITS.knowledgeTitleMax)
      expect(doc.content.length).toBeLessThanOrEqual(LIMITS.knowledgeContentMax)
    }
  })

  it('drops a document missing its title or its body', () => {
    const agent = agentFromJson({
      knowledge: [
        { title: 'Boa', content: 'Conteúdo.' },
        { title: '   ', content: 'Sem título.' },
        { title: 'Sem corpo', content: '' },
        'nem é um objeto',
      ],
    })
    expect(agent.knowledge.map((doc) => doc.title)).toEqual(['Boa'])
  })

  it('keeps provenance only while the catalogue still has that entry', () => {
    const agent = agentFromJson({
      knowledge: [
        { title: 'Do catálogo', content: 'Conteúdo.', sourceId: 'clear-writing' },
        { title: 'De um catálogo antigo', content: 'Conteúdo.', sourceId: 'já-removida' },
      ],
    })

    expect(agent.knowledge[0].sourceId).toBe('clear-writing')
    expect(agent.knowledge[1].sourceId).toBeUndefined()
  })

  it('survives a knowledge field that is not an array', () => {
    expect(agentFromJson({ name: 'Teste', knowledge: 'sim' }).knowledge).toEqual([])
    expect(agentFromJson({ name: 'Teste', knowledge: null }).knowledge).toEqual([])
  })

  it('reads knowledge back out of a config.json', () => {
    const config = JSON.parse(generateConfigJson(starter()))
    expect(config.knowledge.length).toBeGreaterThan(0)
    expect(agentFromJson(config).knowledge.map((doc) => doc.title)).toEqual(
      config.knowledge.map((/** @type {{ title: string }} */ doc) => doc.title)
    )
  })
})
