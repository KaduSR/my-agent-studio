import { describe, expect, it } from 'vitest'
import {
  generateAgentMarkdown,
  joinBlocks,
  knowledgeDocument,
  knowledgeSection,
  orderedRuleTexts,
} from '../../js/agent/markdown.js'
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
      guardRails: [
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
      '## Guard Rails',
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
    const agent = createEmptyAgent({ name: 'Vazio', guardRails: [], tools: [] })
    const markdown = generateAgentMarkdown(agent)

    expect(markdown).toContain('# Vazio')
    expect(markdown).not.toContain('## Purpose')
    expect(markdown).not.toContain('## Soul')
    expect(markdown).not.toContain('## Guard Rails')
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

  /**
   * "Has a terminal" and "may run commands without asking" are different
   * statements, and only the second one matters to whoever runs the agent.
   */
  it('states the permission of every tool, before its usage notes', () => {
    const agent = createAgentFromTemplate('sales-email')
    const markdown = generateAgentMarkdown({
      ...agent,
      tools: agent.tools.map((tool) =>
        tool.id === 'web-search' ? { ...tool, rules: ['Citar a fonte'] } : tool
      ),
    })

    expect(markdown).toContain('- **Web Search**')
    expect(markdown).toContain('  - Permissão: usa sem pedir confirmação')
    expect(markdown).toContain('  - Permissão: pergunta antes de usar')

    // The permission is the line a harness acts on, so it comes first.
    const tools = markdown.slice(markdown.indexOf('## Tools'))
    expect(tools.indexOf('Permissão:')).toBeLessThan(tools.indexOf('Citar a fonte'))
  })

  it('uses the permission the user chose over the catalogue default', () => {
    const agent = createAgentFromTemplate('sales-email')
    const markdown = generateAgentMarkdown({
      ...agent,
      tools: agent.tools.map((tool) =>
        tool.id === 'web-search' ? { ...tool, permission: 'read-only' } : tool
      ),
    })

    expect(markdown).toContain('  - Permissão: somente leitura')
  })

  it('describes a custom tool with the name and purpose the user gave it', () => {
    const agent = createEmptyAgent({ name: 'Com MCP' })
    const markdown = generateAgentMarkdown({
      ...agent,
      tools: [
        ...agent.tools,
        {
          id: 'custom-mcp-do-time',
          name: 'MCP do time',
          enabled: true,
          custom: true,
          permission: 'ask',
          purpose: 'Consultar o catálogo interno.',
        },
      ],
    })

    expect(markdown).toContain('- **MCP do time** — Consultar o catálogo interno.')
    expect(markdown).toContain('  - Permissão: pergunta antes de usar')
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
      guardRails: [{ id: '1', text: '# Isto não é um título', order: 0 }],
    })
    expect(generateAgentMarkdown(agent)).toContain('1. # Isto não é um título')
  })
})

describe('knowledgeSection', () => {
  /**
   * @param {Array<{ title: string, content: string, order?: number }>} docs
   * @returns {import('../../js/agent/types.js').Agent}
   */
  const withKnowledge = (docs) =>
    createEmptyAgent({
      name: 'Teste',
      objective: 'Objetivo',
      knowledge: docs.map((doc, index) => ({
        id: String(index),
        order: doc.order ?? index,
        title: doc.title,
        content: doc.content,
      })),
    })

  it('emits nothing at all when there is no knowledge', () => {
    expect(knowledgeSection(createStarterAgent())).not.toBe('')
    expect(knowledgeSection(createEmptyAgent())).toBe('')
    expect(generateAgentMarkdown(createEmptyAgent())).not.toContain('## Knowledge')
  })

  it('lists documents in their own order, under one heading', () => {
    const section = knowledgeSection(
      withKnowledge([
        { title: 'Segunda', content: 'Depois.', order: 1 },
        { title: 'Primeira', content: 'Antes.', order: 0 },
      ])
    )
    expect(section.split('\n').filter((line) => line.startsWith('#'))).toEqual([
      '## Knowledge',
      '### Primeira',
      '### Segunda',
    ])
  })

  it('drops a document with no title or no content', () => {
    expect(
      knowledgeSection(
        withKnowledge([
          { title: '   ', content: 'Órfão.' },
          { title: 'Sem corpo', content: '  ' },
        ])
      )
    ).toBe('')
  })

  it('pushes a document own headings below the heading that holds it', () => {
    const section = knowledgeSection(
      withKnowledge([{ title: 'Guia', content: '# Outro título\n\n## Sub\n\nTexto.' }])
    )
    expect(section.split('\n').filter((line) => line.startsWith('#'))).toEqual([
      '## Knowledge',
      '### Guia',
      '#### Outro título',
      '##### Sub',
    ])
  })

  it('folds away a title the document repeats, without skipping a level', () => {
    const section = knowledgeSection(
      withKnowledge([{ title: 'Guia', content: '# Guia\n\n## Sempre\n\n- Um.' }])
    )
    expect(section.split('\n').filter((line) => line.startsWith('#'))).toEqual([
      '## Knowledge',
      '### Guia',
      '#### Sempre',
    ])
  })

  it('re-levels for a standalone document too', () => {
    const [doc] = withKnowledge([{ title: 'Guia', content: '# Guia\n\n## Sempre\n\n- Um.' }])
      .knowledge
    expect(knowledgeDocument(doc, 1).split('\n').filter((line) => line.startsWith('#'))).toEqual([
      '# Guia',
      '## Sempre',
    ])
  })

  it('leaves a hash inside a fenced block alone', () => {
    const section = knowledgeSection(
      withKnowledge([{ title: 'Guia', content: '```sh\n# não é título\n```\n\n## Real' }])
    )
    expect(section).toContain('# não é título')
    expect(section).toContain('#### Real')
  })

  it('never pushes a heading past h6', () => {
    const section = knowledgeSection(
      withKnowledge([{ title: 'Guia', content: '###### Fundo do poço\n\nTexto.' }])
    )
    expect(section).toContain('###### Fundo do poço')
    expect(section).not.toMatch(/^#{7}/m)
  })

  it('sits between tools and memory in the full document', () => {
    const markdown = generateAgentMarkdown(createStarterAgent())
    expect(markdown.indexOf('## Tools')).toBeLessThan(markdown.indexOf('## Knowledge'))
    expect(markdown.indexOf('## Knowledge')).toBeLessThan(markdown.indexOf('## Memory'))
  })
})
