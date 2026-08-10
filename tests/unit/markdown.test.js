import { describe, expect, it } from 'vitest'
import { generateAgentMarkdown, joinBlocks, orderedRuleTexts } from '../../js/agent/markdown.js'
import { createAgentFromTemplate, createEmptyAgent } from '../../js/agent/defaults.js'

/** A fully configured agent, to exercise every section of the document. */
const createStarterAgent = () => createAgentFromTemplate('sales-email')

describe('joinBlocks', () => {
  it('separates blocks with a single blank line and drops empty ones', () => {
    expect(joinBlocks('a', '', 'b', null, false, 'c')).toBe('a\n\nb\n\nc')
  })
})

describe('orderedRuleTexts', () => {
  it('sorts by order and drops blank rules', () => {
    const agent = createEmptyAgent({
      hardRules: [
        { id: '1', text: 'terceira', order: 2 },
        { id: '2', text: '   ', order: 1 },
        { id: '3', text: 'primeira', order: 0 },
      ],
    })
    expect(orderedRuleTexts(agent)).toEqual(['primeira', 'terceira'])
  })
})

describe('generateAgentMarkdown', () => {
  it('produces the SPEC 35 document shape for a fully configured agent', () => {
    const markdown = generateAgentMarkdown(createStarterAgent())

    expect(markdown.startsWith('# Redator de E-mails de Vendas\n')).toBe(true)
    for (const section of [
      '## Purpose',
      '## Soul',
      '### Mission',
      '### Essence',
      '### Values',
      '## Personality',
      '### Tone',
      '### Traits',
      '### Response Style',
      '## Hard Rules',
      '## Tools',
      '## Memory',
      '### Remember',
      '### Never Remember',
    ]) {
      expect(markdown).toContain(section)
    }
  })

  it('renders human labels, not internal ids', () => {
    const markdown = generateAgentMarkdown(createStarterAgent())
    expect(markdown).toContain('- Consultivo')
    expect(markdown).toContain('- Profissional')
    expect(markdown).toContain('Claro e direto.')
    expect(markdown).not.toContain('clear-direct')
    expect(markdown).not.toContain('consultative')
  })

  it('numbers hard rules in their user-defined order', () => {
    const markdown = generateAgentMarkdown(createStarterAgent())
    expect(markdown).toContain('1. Nunca invente números, cases ou resultados de clientes.')
    expect(markdown).toContain(
      '6. Pergunte o contexto do cliente antes de escrever, se ele não foi dado.'
    )
  })

  it('omits sections with nothing in them', () => {
    const agent = createEmptyAgent({ name: 'Vazio', hardRules: [], tools: [] })
    const markdown = generateAgentMarkdown(agent)

    expect(markdown).toContain('# Vazio')
    expect(markdown).not.toContain('## Purpose')
    expect(markdown).not.toContain('## Soul')
    expect(markdown).not.toContain('## Hard Rules')
    expect(markdown).not.toContain('## Tools')
  })

  it('falls back to a placeholder title when the agent is unnamed', () => {
    expect(generateAgentMarkdown(createEmptyAgent())).toContain('# Agente sem nome')
  })

  it('describes sliders with a human band, never a bare number', () => {
    const markdown = generateAgentMarkdown(createStarterAgent())
    expect(markdown).toContain('Criatividade: 60/100 — Experimental')
    expect(markdown).toContain('Precisão: 70/100 — Rigoroso')
  })

  it('never leaves more than one blank line between blocks', () => {
    expect(generateAgentMarkdown(createStarterAgent())).not.toMatch(/\n{3}/)
  })

  it('is a pure function of the agent', () => {
    const agent = createStarterAgent()
    expect(generateAgentMarkdown(agent)).toBe(generateAgentMarkdown(structuredClone(agent)))
  })

  it('treats user text as literal content, never as structure', () => {
    // A rule containing Markdown syntax must not become a heading.
    const agent = createEmptyAgent({
      name: 'Teste',
      objective: 'Objetivo',
      hardRules: [{ id: '1', text: '# Isto não é um título', order: 0 }],
    })
    expect(generateAgentMarkdown(agent)).toContain('1. # Isto não é um título')
  })
})
