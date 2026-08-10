import { describe, expect, it } from 'vitest'
import { buildFileTree, exportRootName, generateConfigJson, SCHEMA_VERSION } from '../../js/agent/files.js'
import { createAgentFromTemplate, createEmptyAgent } from '../../js/agent/defaults.js'

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
      'memory.md',
      'config.json',
    ])
  })

  it('matches the SPEC 40 structure for the Claude Code preset', () => {
    expect(paths(createStarterAgent(), 'claude-code')).toEqual([
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

  it('exports only the enabled tools', () => {
    const config = JSON.parse(generateConfigJson(createStarterAgent()))
    expect(config.tools.map((/** @type {{ id: string }} */ tool) => tool.id)).toEqual(['web-search', 'email'])
  })
})
