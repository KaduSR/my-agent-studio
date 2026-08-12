import { describe, expect, it } from 'vitest'
import {
  LOOP_CEILING,
  buildTeamFileTree,
  generateTeamClaudeMarkdown,
  generateTeamJson,
  seatSlugs,
  teamRootName,
  yamlString,
} from '../../js/team/files.js'
import { resolveSeats } from '../../js/team/markdown.js'
import { createEmptyTeam, createTeamMember } from '../../js/team/defaults.js'
import { createEmptyAgent } from '../../js/agent/defaults.js'

const ANA = createEmptyAgent({
  id: 'a',
  name: 'Ana',
  description: 'Checa cada dado antes de passar adiante.',
  objective: 'Levantar fontes primárias.',
})
const BRUNO = createEmptyAgent({ id: 'b', name: 'Bruno', objective: 'Escrever para leigos.' })

/** @param {string} id */
const lookup = (id) => [ANA, BRUNO].find((candidate) => candidate.id === id)

/**
 * @param {Partial<import('../../js/team/types.js').Team>} [overrides]
 * @returns {import('../../js/team/types.js').Team}
 */
const team = (overrides = {}) =>
  createEmptyTeam({
    name: 'Time de Conteúdo',
    objective: 'Publicar um artigo por semana.',
    members: [
      createTeamMember('a', 'Levantar cinco estudos recentes.'),
      createTeamMember('b', 'Escrever 800 palavras.'),
    ],
    ...overrides,
  })

/** @param {import('../../js/team/types.js').Team} t */
const tree = (t) => buildTeamFileTree(t, resolveSeats(t, lookup))

/**
 * @param {import('../../js/agent/files.js').ExportFile[]} files
 * @param {string} path
 */
const file = (files, path) => files.find((entry) => entry.path === path)

describe('the folder Claude Code reads', () => {
  it('puts the project instructions at the root and a subagent per member', () => {
    const paths = tree(team()).map((entry) => entry.path)

    expect(paths).toContain('CLAUDE.md')
    expect(paths).toContain('.claude/agents/ana.md')
    expect(paths).toContain('.claude/agents/bruno.md')
  })

  it('ships the team both as a document and as machine-readable config', () => {
    const paths = tree(team()).map((entry) => entry.path)

    expect(paths).toContain('TEAM.md')
    expect(paths).toContain('team.json')
    // Each agent's own config travels too, so the team can be taken apart again.
    expect(paths).toContain('agents/ana.json')
    expect(paths).toContain('agents/bruno.json')
  })

  it('names the root folder after the team', () => {
    expect(teamRootName(team())).toBe('time-de-conteudo')
    expect(teamRootName(team({ name: '   ' }))).toBe('meu-time')
  })

  it('writes no subagent for a member whose agent was deleted, and says so', () => {
    const ghosted = team({
      members: [createTeamMember('a', 'Levantar estudos.'), createTeamMember('gone', 'Revisar.')],
    })
    const files = tree(ghosted)
    const paths = files.map((entry) => entry.path)

    expect(paths.filter((path) => path.startsWith('.claude/agents/'))).toHaveLength(1)
    expect(file(files, 'CLAUDE.md')?.content).toContain('Uma mesa deste time estava vazia')
  })

  it('keeps two agents with the same name in separate files', () => {
    const twin = createEmptyAgent({ id: 'b', name: 'Ana', objective: 'Outra Ana.' })
    const seats = resolveSeats(team(), (id) => (id === 'a' ? ANA : twin))

    expect([...seatSlugs(seats).values()]).toEqual(['ana', 'ana-2'])
  })
})

describe('the subagent front matter', () => {
  it('carries a name and a description Claude Code can parse', () => {
    const files = tree(team())
    const ana = /** @type {string} */ (file(files, '.claude/agents/ana.md')?.content)

    expect(ana.startsWith('---\n')).toBe(true)
    expect(ana).toContain('name: ana\n')
    expect(ana).toContain('description: "Checa cada dado antes de passar adiante."')
  })

  it('escapes what would otherwise break the parse', () => {
    // A colon, a quote or a newline in a bare YAML scalar is the difference
    // between a subagent Claude Code sees and one it silently does not.
    expect(yamlString('Faz X: e "Y"')).toBe('"Faz X: e \\"Y\\""')
    expect(yamlString('uma\nlinha   partida')).toBe('"uma linha partida"')
  })

  it('tells each agent what it was told to do in this team', () => {
    const files = tree(team())
    const ana = /** @type {string} */ (file(files, '.claude/agents/ana.md')?.content)

    expect(ana).toContain('## Role in the team')
    expect(ana).toContain('## Assignment')
    expect(ana).toContain('Levantar cinco estudos recentes.')
    expect(ana).toContain('Time de Conteúdo')
  })

  it('tells the manager it is the manager, and the others they are not', () => {
    const managed = team({ mode: 'managed', leadId: 'a' })
    const files = tree(managed)

    expect(file(files, '.claude/agents/ana.md')?.content).toContain('você é o gerente')
    expect(file(files, '.claude/agents/ana.md')?.content).toContain('## Coordination brief')
    expect(file(files, '.claude/agents/bruno.md')?.content).toContain('você é um especialista')
  })
})

describe('the loop', () => {
  it('is written into CLAUDE.md, with a stopping condition', () => {
    const claude = generateTeamClaudeMarkdown(team(), resolveSeats(team(), lookup))

    expect(claude).toContain('## The loop')
    expect(claude).toContain('roda em laço até o objetivo ser atingido')
    expect(claude).toContain('### Stopping')
    expect(claude).toContain('toda ordem tiver sido cumprida')
  })

  it('gives the manager the decision to stop when there is one', () => {
    const managed = team({ mode: 'managed', leadId: 'b' })
    const claude = generateTeamClaudeMarkdown(managed, resolveSeats(managed, lookup))

    expect(claude).toContain('Quem decide parar é o gerente')
    expect(claude).toContain('Neste time, é **Bruno**')
    expect(claude).toContain('o papel de gerente é de **Bruno** (`bruno`)')
  })

  it('states the ceiling as a safety net and not as the stopping mechanism', () => {
    const claude = generateTeamClaudeMarkdown(team(), resolveSeats(team(), lookup))

    expect(claude).toContain(`Teto de iterações: ${LOOP_CEILING}`)
    expect(claude).toContain('rede de segurança')
    expect(claude).toContain('não o mecanismo de parada')
  })

  it('names the goal the loop is running towards', () => {
    const claude = generateTeamClaudeMarkdown(team(), resolveSeats(team(), lookup))

    expect(claude).toContain('## Goal')
    expect(claude).toContain('Publicar um artigo por semana.')
  })
})

describe('team.json', () => {
  it('carries the goal, the mode, the manager and the loop', () => {
    const managed = team({ mode: 'managed', leadId: 'a' })
    const config = JSON.parse(generateTeamJson(managed, resolveSeats(managed, lookup)))

    expect(config).toMatchObject({
      name: 'Time de Conteúdo',
      goal: 'Publicar um artigo por semana.',
      mode: 'managed',
      lead: 'ana',
      loop: { maxIterations: LOOP_CEILING, stop: 'manager' },
    })
    expect(config.members).toEqual([
      { agent: 'ana', name: 'Ana', assignment: 'Levantar cinco estudos recentes.', available: true },
      { agent: 'bruno', name: 'Bruno', assignment: 'Escrever 800 palavras.', available: true },
    ])
  })

  it('flags a member whose agent is gone rather than dropping the row', () => {
    const ghosted = team({ members: [createTeamMember('gone', 'Revisar.')] })
    const config = JSON.parse(generateTeamJson(ghosted, resolveSeats(ghosted, lookup)))

    expect(config.members[0].available).toBe(false)
  })
})

describe('the kit describes itself honestly', () => {
  it('names in CLAUDE.md every kind of file the folder actually contains', () => {
    // The Files list is documentation of the folder it ships inside, and the way
    // that goes wrong is silently: someone adds a file and the list stops being
    // true, with nothing failing.
    const files = tree(team())
    const claude = /** @type {string} */ (file(files, 'CLAUDE.md')?.content)

    const roots = new Set(
      files
        .map((entry) => entry.path)
        .filter((path) => path !== 'CLAUDE.md')
        .map((path) => (path.includes('/') ? `${path.slice(0, path.indexOf('/'))}/` : path))
    )

    for (const root of roots) {
      expect(claude, `CLAUDE.md does not mention ${root}`).toContain(root)
    }
  })

  it('leaves no file empty', () => {
    for (const entry of tree(team({ mode: 'managed', leadId: 'a' }))) {
      expect(entry.content.trim().length, entry.path).toBeGreaterThan(0)
    }
  })
})
