import { describe, expect, it } from 'vitest'
import { buildFileTree, exportRootName, generateConfigJson, SCHEMA_VERSION } from '../../js/agent/files.js'
import { createAgentFromTemplate, createEmptyAgent } from '../../js/agent/defaults.js'
import { SLIDER_IDS } from '../../js/data/behavior-sliders.js'

/** A fully configured agent, so every preset produces real content. */
const createStarterAgent = () => createAgentFromTemplate('sales-email')

/**
 * @param {import('../../js/agent/types.js').Agent} agent
 * @param {import('../../js/agent/presets.js').PresetId} preset
 */
const paths = (agent, preset) => buildFileTree(agent, preset).map((file) => file.path)

describe('buildFileTree', () => {
  it('emits a single document for the markdown preset', () => {
    expect(paths(createStarterAgent(), 'markdown')).toEqual(['AGENT.md'])
  })

  it('matches the SPEC 37 structure for the generic preset', () => {
    expect(paths(createStarterAgent(), 'generic')).toEqual([
      'AGENT.md',
      'README.md',
      'soul.md',
      'personality.md',
      'rules.md',
      'tools.md',
      'knowledge.md',
      'memory.md',
      'config.json',
    ])
  })

  it('matches the SPEC 40 structure for the Claude Code preset', () => {
    // The starter template ships three knowledge documents, and this preset gives
    // each one its own file under references/ rather than one aggregated page.
    expect(paths(createStarterAgent(), 'claude-code')).toEqual([
      'CLAUDE.md',
      'soul.md',
      'personality.md',
      'rules.md',
      'memory.md',
      'references/README.md',
      'references/ajustar-o-tom-ao-publico.md',
      'references/escrita-clara.md',
      'references/lidar-com-incerteza.md',
    ])
  })

  it('leaves the references folder with only its README when there is no knowledge', () => {
    const agent = createStarterAgent()
    agent.knowledge = []
    expect(paths(agent, 'claude-code')).toEqual([
      'CLAUDE.md',
      'soul.md',
      'personality.md',
      'rules.md',
      'memory.md',
      'references/README.md',
    ])
  })

  it('never emits an empty file, even for a blank agent', () => {
    for (const preset of /** @type {const} */ (['markdown', 'generic', 'claude-code'])) {
      for (const file of buildFileTree(createEmptyAgent(), preset)) {
        expect(file.content.trim().length, `${preset}:${file.path}`).toBeGreaterThan(0)
      }
    }
  })

  it('gives each standalone file its own H1', () => {
    const files = buildFileTree(createStarterAgent(), 'generic')
    const soul = files.find((file) => file.path === 'soul.md')
    expect(soul?.content.startsWith('# Soul')).toBe(true)
  })

  it('rejects an unknown preset instead of silently producing nothing', () => {
    // @ts-expect-error deliberately invalid
    expect(() => buildFileTree(createStarterAgent(), 'nope')).toThrow(/Unknown export preset/)
  })
})

describe('exportRootName', () => {
  it('slugifies the agent name, stripping accents', () => {
    const agent = createEmptyAgent({ name: 'Assistente de Aprendizado' })
    expect(exportRootName(agent, 'generic')).toBe('assistente-de-aprendizado')
  })

  it('uses a stable folder for the Claude Code preset (SPEC 40)', () => {
    expect(exportRootName(createStarterAgent(), 'claude-code')).toBe('agent')
  })

  it('falls back when the name yields no usable slug', () => {
    expect(exportRootName(createEmptyAgent({ name: '???' }), 'generic')).toBe('meu-agente')
  })
})

describe('generateConfigJson', () => {
  it('is valid JSON carrying the schema version (SPEC 89)', () => {
    const config = JSON.parse(generateConfigJson(createStarterAgent()))
    expect(config.schemaVersion).toBe(SCHEMA_VERSION)
    expect(config.version).toBe('1.0')
  })

  it('carries every field SPEC 39 lists', () => {
    const config = JSON.parse(generateConfigJson(createStarterAgent()))
    expect(config.name).toBe('Redator de E-mails de Vendas')
    expect(config.personality).toMatchObject({
      creativity: 60,
      precision: 70,
      formality: 55,
      proactivity: 70,
      detail: 40,
      autonomy: 45,
    })
    expect(config.personality.tones).toEqual(['consultative', 'direct', 'professional'])
    expect(config.memory.type).toBe('persistent')
    expect(config.rules[0]).toBe('Nunca invente números, cases ou resultados de clientes.')
  })

  it('exports only the enabled tools, each with its permission', () => {
    const config = JSON.parse(generateConfigJson(createStarterAgent()))
    expect(config.tools.map((/** @type {{ id: string }} */ tool) => tool.id)).toEqual(['web-search', 'email'])
    expect(config.tools.map((/** @type {{ permission: string }} */ tool) => tool.permission)).toEqual([
      'auto',
      'ask',
    ])
  })

  it('carries every slider, including the ones added after the first release', () => {
    const config = JSON.parse(generateConfigJson(createStarterAgent()))
    for (const id of SLIDER_IDS) {
      expect(typeof config.personality[id], id).toBe('number')
    }
  })

  it('marks a custom tool as such, so a reader knows it is not from the catalogue', () => {
    const agent = createStarterAgent()
    const config = JSON.parse(
      generateConfigJson({
        ...agent,
        tools: [
          ...agent.tools,
          {
            id: 'custom-mcp',
            name: 'MCP do time',
            enabled: true,
            custom: true,
            permission: 'ask',
            description: 'Interno.',
          },
        ],
      })
    )

    const custom = config.tools.find((/** @type {{ id: string }} */ tool) => tool.id === 'custom-mcp')
    expect(custom.custom).toBe(true)
    expect(custom.description).toBe('Interno.')
  })
})

describe('knowledge in the export', () => {
  /**
   * @param {Array<{ title: string, content: string }>} docs
   * @returns {import('../../js/agent/types.js').Agent}
   */
  const withDocs = (docs) => {
    const agent = createStarterAgent()
    agent.knowledge = docs.map((doc, index) => ({
      id: String(index),
      order: index,
      title: doc.title,
      content: doc.content,
    }))
    return agent
  }

  it('gives each document its own file, named after its title', () => {
    const files = buildFileTree(withDocs([{ title: 'Guia de voz', content: '## Sempre' }]), 'claude-code')
    const file = files.find((entry) => entry.path.startsWith('references/guia'))

    expect(file?.path).toBe('references/guia-de-voz.md')
    expect(file?.content).toBe('# Guia de voz\n\n## Sempre\n')
  })

  it('disambiguates two documents that share a title', () => {
    const files = buildFileTree(
      withDocs([
        { title: 'Nota', content: 'Primeira.' },
        { title: 'Nota', content: 'Segunda.' },
      ]),
      'claude-code'
    )
    const docs = files
      .map((file) => file.path)
      .filter((path) => path.startsWith('references/') && path !== 'references/README.md')

    expect(docs).toEqual(['references/nota.md', 'references/nota-2.md'])
    expect(files.find((file) => file.path === 'references/nota-2.md')?.content).toContain('Segunda.')
  })

  it('falls back to a positional name when a title has no slug of its own', () => {
    const files = buildFileTree(withDocs([{ title: '?!', content: 'Conteúdo.' }]), 'claude-code')
    expect(files.map((file) => file.path)).toContain('references/documento-1.md')
  })

  it('repeats the documents inside CLAUDE.md, so they are read even unopened', () => {
    const files = buildFileTree(withDocs([{ title: 'Guia de voz', content: '## Sempre' }]), 'claude-code')
    const claude = /** @type {{ content: string }} */ (
      files.find((file) => file.path === 'CLAUDE.md')
    )

    expect(claude.content).toContain('## Knowledge')
    expect(claude.content).toContain('### Guia de voz')
    expect(claude.content).toContain('- `references/`')
  })

  it('aggregates them into knowledge.md for the generic preset', () => {
    const files = buildFileTree(withDocs([{ title: 'Guia de voz', content: '## Sempre' }]), 'generic')
    const knowledge = /** @type {{ content: string }} */ (
      files.find((file) => file.path === 'knowledge.md')
    )

    expect(knowledge.content.split('\n')[0]).toBe('# Knowledge')
    expect(knowledge.content).toContain('## Guia de voz')
  })

  it('still writes a knowledge.md a reader can understand when there is none', () => {
    const agent = createStarterAgent()
    agent.knowledge = []
    const knowledge = /** @type {{ content: string }} */ (
      buildFileTree(agent, 'generic').find((file) => file.path === 'knowledge.md')
    )
    expect(knowledge.content).toContain('Nenhum documento adicionado.')
  })

  it('carries the documents into config.json, in order, with their provenance', () => {
    const config = JSON.parse(generateConfigJson(createStarterAgent()))

    expect(config.knowledge.map((/** @type {{ title: string }} */ doc) => doc.title)).toEqual([
      'Ajustar o tom ao público',
      'Escrita clara',
      'Lidar com incerteza',
    ])
    expect(config.knowledge[0].source).toBe('tone-of-voice')
    expect(config.knowledge[0].content.length).toBeGreaterThan(200)
  })

  it('omits the source key for a document nobody copied', () => {
    const config = JSON.parse(generateConfigJson(withDocs([{ title: 'Nota', content: 'Conteúdo.' }])))
    expect(config.knowledge).toEqual([{ title: 'Nota', content: 'Conteúdo.' }])
  })
})
