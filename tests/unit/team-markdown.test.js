import { describe, expect, it } from 'vitest'
import {
  generateTeamMarkdown,
  generateTeamPrompt,
  ordersSection,
  resolveSeats,
} from '../../js/team/markdown.js'
import { createEmptyTeam, createTeamMember } from '../../js/team/defaults.js'
import { createEmptyAgent } from '../../js/agent/defaults.js'

/**
 * @param {string} id
 * @param {string} name
 * @param {string} objective
 * @returns {import('../../js/agent/types.js').Agent}
 */
const agent = (id, name, objective) => createEmptyAgent({ id, name, objective })

const ANA = agent('a', 'Ana', 'Levantar fontes e checar cada dado.')
const BRUNO = agent('b', 'Bruno', 'Escrever textos claros para leigos.')

/** @param {string} id */
const lookup = (id) => [ANA, BRUNO].find((candidate) => candidate.id === id)

/**
 * @param {Partial<import('../../js/team/types.js').Team>} [overrides]
 * @returns {import('../../js/team/types.js').Team}
 */
function team(overrides = {}) {
  return createEmptyTeam({
    name: 'Time de Conteúdo',
    objective: 'Publicar um artigo por semana.',
    members: [
      createTeamMember('a', 'Levantar cinco estudos dos últimos 12 meses.'),
      createTeamMember('b', 'Escrever 800 palavras a partir das notas.'),
    ],
    ...overrides,
  })
}

/** @param {import('../../js/team/types.js').Team} t */
const render = (t) => generateTeamMarkdown(t, resolveSeats(t, lookup))

describe('the two modes produce different documents', () => {
  it('gives direct orders a numbered Orders section and no Coordination', () => {
    const markdown = render(team())

    expect(markdown).toContain('## Orders')
    expect(markdown).not.toContain('## Coordination')
    expect(markdown).toContain('1. **Ana**: Levantar cinco estudos dos últimos 12 meses.')
    expect(markdown).toContain('2. **Bruno**: Escrever 800 palavras a partir das notas.')
  })

  it('gives a managed team a Coordination section naming the manager', () => {
    const markdown = render(team({ mode: 'managed', leadId: 'a' }))

    expect(markdown).toContain('## Coordination')
    expect(markdown).not.toContain('## Orders')
    expect(markdown).toContain('**Gerente:** Ana')
    // The manager's own text is the coordination brief, not a task in a list.
    expect(markdown).toContain('Levantar cinco estudos dos últimos 12 meses.')
    expect(markdown).toContain('### Specialists')
    expect(markdown).toContain('- **Bruno**: Escrever 800 palavras a partir das notas.')
  })

  it('says the team has no manager yet rather than pretending it has one', () => {
    const markdown = render(team({ mode: 'managed', leadId: null }))

    expect(markdown).toContain('ainda não tem gerente definido')
    expect(markdown).not.toContain('## Coordination')
  })
})

describe('the roster', () => {
  it('lists every member with the objective from their own agent', () => {
    const markdown = render(team())

    expect(markdown).toContain('## Team')
    expect(markdown).toContain('- **Ana**: Levantar fontes e checar cada dado.')
    expect(markdown).toContain('- **Bruno**: Escrever textos claros para leigos.')
  })

  it('points at the agents rather than embedding them', () => {
    const markdown = render(team())

    // A team document that inlined eight agent documents would bury the thing it
    // exists to say.
    expect(markdown).not.toContain('## Soul')
    expect(markdown).not.toContain('## Personality')
    expect(markdown).toContain('Cada agente deste time tem o próprio documento')
  })
})

describe('a member whose agent was deleted', () => {
  const ghosted = team({
    members: [createTeamMember('a', 'Levantar estudos.'), createTeamMember('gone', 'Revisar.')],
  })

  it('renders without throwing and names the hole', () => {
    const markdown = render(ghosted)

    expect(markdown).toContain('(agente indisponível)')
    expect(markdown).toContain('Uma mesa ficou vazia')
  })

  it('counts more than one', () => {
    const twoGone = team({
      members: [createTeamMember('gone-1'), createTeamMember('gone-2')],
    })

    expect(render(twoGone)).toContain('2 mesas ficaram vazias')
  })
})

describe('empty orders', () => {
  it('leaves a member with nothing written out of the Orders list', () => {
    const seats = resolveSeats(
      team({ members: [createTeamMember('a', 'Levantar estudos.'), createTeamMember('b', '   ')] }),
      lookup
    )

    const section = ordersSection(team(), seats)
    expect(section).toContain('1. **Ana**: Levantar estudos.')
    expect(section).not.toContain('Bruno')
  })

  it('drops the whole section when nobody was told anything', () => {
    const seats = resolveSeats(team({ members: [createTeamMember('a'), createTeamMember('b')] }), lookup)

    expect(ordersSection(team(), seats)).toBe('')
  })
})

describe('the paste-ready prompt', () => {
  it('wraps the document in a delimiter and picks the instructions for the mode', () => {
    const direct = team()
    const prompt = generateTeamPrompt(direct, resolveSeats(direct, lookup))

    expect(prompt).toContain('<time>')
    expect(prompt).toContain('</time>')
    expect(prompt).toContain('Leia o objetivo do time e a lista de ordens.')
    expect(prompt).not.toContain('Assuma o papel do gerente')
  })

  it('tells the model to be the manager in a managed team', () => {
    const managed = team({ mode: 'managed', leadId: 'a' })
    const prompt = generateTeamPrompt(managed, resolveSeats(managed, lookup))

    expect(prompt).toContain('Assuma o papel do gerente')
    expect(prompt).not.toContain('Assuma um agente por vez')
  })
})

describe('house style', () => {
  it('uses no em dash anywhere in the generated copy', () => {
    // Same rule the interface follows: the character is not in this product.
    const managed = team({ mode: 'managed', leadId: 'a' })

    expect(render(team())).not.toContain('—')
    expect(render(managed)).not.toContain('—')
    expect(generateTeamPrompt(managed, resolveSeats(managed, lookup))).not.toContain('—')
  })

  it('names an unnamed team rather than emitting a bare heading', () => {
    expect(render(team({ name: '   ' }))).toContain('# Time sem nome')
  })
})
