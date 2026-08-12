// @ts-check
/**
 * The team kit: the folder a repository carries so Claude Code can actually run
 * the team.
 *
 * The shape is the one Claude Code already looks for. `CLAUDE.md` at the root is
 * read as project instructions, and every file under `.claude/agents/` is a
 * subagent, addressable by the `name` in its front matter. So the kit is not a
 * description of a team, it is a team: drop the folder in a project, open Claude
 * Code, and the agents are there to be delegated to.
 *
 * What turns a roster into something that runs is the loop, and the loop is
 * written into CLAUDE.md rather than left implied. It carries a goal, a stopping
 * condition owned by the model, and an iteration ceiling that is a safety net
 * against runaway spend and never the stopping mechanism itself. That is the
 * distinction the keynote's agentic track spends a slide on, and getting it
 * backwards is how a team burns tokens forever.
 */

import { slugify } from '../lib/uuid.js'
import { bullets, generateAgentMarkdown, heading, joinBlocks, numbered } from '../agent/markdown.js'
import { generateConfigJson } from '../agent/files.js'
import { activeLead } from './defaults.js'
import { getTeamMode } from '../data/team-modes.js'
import { generateTeamMarkdown } from './markdown.js'

/** Bump when the exported kit changes shape in a way a consumer must notice. */
export const TEAM_SCHEMA_VERSION = 1

/**
 * The safety net, not the stop condition.
 *
 * A team with no ceiling and a stop condition the model owns is one bad judgement
 * away from looping until the credits run out. Twelve is enough for every agent
 * to work and be reviewed more than once, and small enough that a mistake is
 * cheap.
 */
export const LOOP_CEILING = 12

/** @typedef {import('../agent/files.js').ExportFile} ExportFile */
/** @typedef {import('./markdown.js').TeamSeat} TeamSeat */

/**
 * Quote a value for YAML front matter.
 *
 * Front matter is the one place in the kit where a stray colon or newline stops
 * being cosmetic and starts breaking the parse, which would make the subagent
 * invisible to Claude Code with no error anyone would see.
 *
 * @param {string} value
 * @returns {string}
 */
export function yamlString(value) {
  const flat = value.replace(/\s+/g, ' ').trim()
  return `"${flat.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * A unique slug per seat, so two agents with the same name cannot quietly
 * overwrite each other's file inside the ZIP.
 *
 * @param {TeamSeat[]} seats
 * @returns {Map<string, string>} agentId to slug.
 */
export function seatSlugs(seats) {
  /** @type {Map<string, string>} */
  const slugs = new Map()
  /** @type {Set<string>} */
  const taken = new Set()

  seats.forEach((seat, index) => {
    const base = slugify(seat.agent?.name ?? '', `agente-${index + 1}`)
    let name = base
    for (let suffix = 2; taken.has(name); suffix += 1) name = `${base}-${suffix}`
    taken.add(name)
    slugs.set(seat.member.agentId, name)
  })

  return slugs
}

/**
 * Only the seats that still have an agent behind them. A deleted agent cannot be
 * written as a subagent, and shipping an empty file would be worse than leaving
 * it out and saying so in CLAUDE.md.
 *
 * @param {TeamSeat[]} seats
 * @returns {Array<TeamSeat & { agent: import('../agent/types.js').Agent }>}
 */
function livingSeats(seats) {
  return /** @type {Array<TeamSeat & { agent: import('../agent/types.js').Agent }>} */ (
    seats.filter((seat) => seat.agent !== undefined)
  )
}

/**
 * One Claude Code subagent file.
 *
 * The agent's own document goes in whole, then a section that only makes sense
 * inside this team: what it was told to do, and who it answers to. A subagent
 * that knows its remit but not its team would re-decide the plan on every call.
 *
 * @param {import('./types.js').Team} team
 * @param {TeamSeat & { agent: import('../agent/types.js').Agent }} seat
 * @param {Map<string, string>} slugs
 * @returns {string}
 */
export function subagentFile(team, seat, slugs) {
  const { agent, member } = seat
  const name = slugs.get(member.agentId) ?? slugify(agent.name)
  const summary =
    agent.description?.trim() || agent.objective.trim() || `Integrante do time ${team.name.trim()}.`

  const mode = getTeamMode(team.mode)
  const isLead = activeLead(team)?.agentId === member.agentId
  const remit = member.instruction.trim()

  /** What this agent is, in this team, in one paragraph it can act on. */
  const standing = isLead
    ? mode.lead === 'reviewer'
      ? 'Neste time você é o avaliador. Você não distribui trabalho: lê o que os outros produziram, aprova ou devolve dizendo exatamente o que falta, e repete até passar.'
      : 'Neste time você é o gerente. Recebe o objetivo, divide o trabalho entre os especialistas, decide a quem delegar em cada passo e responde pelo resultado final.'
    : mode.lead === 'reviewer'
      ? 'Neste time você produz. O avaliador vai ler o que você entregar e pode devolver com apontamentos; nesse caso, corrija o que ele apontou em vez de recomeçar.'
      : mode.lead === 'manager'
        ? 'Neste time você é um especialista. O gerente delega e cobra; faça a sua parte e devolva o resultado sem assumir o trabalho dos outros.'
        : mode.sequential
          ? 'Neste time o trabalho passa de mão em mão. Você recebe o que a etapa anterior entregou, faz a sua etapa e entrega para a próxima, sem pular adiante.'
          : 'Neste time cada agente recebe uma ordem própria e responde apenas por ela.'

  const briefHeading = isLead && mode.lead === 'manager' ? 'Coordination brief' : isLead && mode.lead === 'reviewer' ? 'Review brief' : mode.sequential ? 'Step' : 'Assignment'

  const role = joinBlocks(
    heading(2, 'Role in the team'),
    `Este agente faz parte do time **${team.name.trim() || 'sem nome'}**, cujo objetivo é: ${
      team.objective.trim() || 'ainda não definido.'
    }`,
    standing,
    remit ? joinBlocks(heading(3, briefHeading), remit) : ''
  )

  return `---
name: ${name}
description: ${yamlString(summary)}
---

${joinBlocks(generateAgentMarkdown(agent).trim(), role)}
`
}

/**
 * The loop: what running this team actually means.
 * @param {import('./types.js').Team} team
 * @param {Array<TeamSeat & { agent: import('../agent/types.js').Agent }>} living
 * @param {Map<string, string>} slugs
 * @returns {string}
 */
export function loopSection(team, living, slugs) {
  const mode = getTeamMode(team.mode)
  const lead = activeLead(team)
  const leadSeat = lead ? living.find((seat) => seat.member.agentId === lead.agentId) : undefined

  /*
   * The steps are the catalogue's, word for word, so the pasted prompt and this
   * file cannot drift. Who the lead is goes in a line of its own above them
   * rather than being spliced into a sentence: editing the copy in place is how
   * a sentence ends up mangled the day somebody rewords the catalogue.
   */
  const naming = leadSeat
    ? `Neste time, o papel de ${(mode.leadLabel ?? 'líder').toLowerCase()} é de **${leadSeat.agent.name.trim()}** (\`${slugs.get(leadSeat.member.agentId)}\`).`
    : ''

  const stop = leadSeat
    ? `${mode.stop} Neste time, é **${leadSeat.agent.name.trim()}**.`
    : mode.stop

  return joinBlocks(
    heading(2, 'The loop'),
    'Este time não responde uma pergunta e para: ele roda em laço até o objetivo ser atingido. Cada iteração:',
    numbered([...mode.loop]),
    naming,
    heading(3, 'Stopping'),
    stop,
    `**Teto de iterações: ${LOOP_CEILING}.** O teto é rede de segurança contra laço infinito e queima de tokens, não o mecanismo de parada. Se ele for alcançado, pare e relate o que ficou pendente e por quê, em vez de continuar.`,
    heading(3, 'Every iteration must leave a trace'),
    bullets([
      'Que passo foi dado, e por qual agente.',
      'O que voltou, em uma linha.',
      'O que falta para o objetivo.',
    ])
  )
}

/**
 * The project instructions Claude Code reads on open.
 * @param {import('./types.js').Team} team
 * @param {TeamSeat[]} allSeats
 * @returns {string}
 */
export function generateTeamClaudeMarkdown(team, allSeats) {
  const living = livingSeats(allSeats)
  const slugs = seatSlugs(allSeats)
  const missing = allSeats.length - living.length
  const mode = getTeamMode(team.mode)
  const lead = activeLead(team)

  const roster = living.map((seat, index) => {
    const remit = seat.member.instruction.trim()
    const isLead = lead?.agentId === seat.member.agentId
    // Under chain the position is the running order, so it goes in the line.
    const tag = isLead
      ? ` _(${(mode.leadLabel ?? 'líder').toLowerCase()})_`
      : mode.sequential
        ? ` _(etapa ${index + 1})_`
        : ''
    return remit
      ? `**${seat.agent.name.trim()}** (\`${slugs.get(seat.member.agentId)}\`)${tag}: ${remit}`
      : `**${seat.agent.name.trim()}** (\`${slugs.get(seat.member.agentId)}\`)${tag}`
  })

  return `${joinBlocks(
    heading(1, team.name.trim() || 'Time sem nome'),
    team.objective.trim() && `> ${team.objective.trim()}`,
    joinBlocks(
      heading(2, 'Goal'),
      team.objective.trim() ||
        'Ainda não definido. Escreva o objetivo do time antes de rodar o laço.'
    ),
    joinBlocks(
      heading(2, 'How this team works'),
      mode.summary,
      mode.lead && !lead
        ? `Este time precisa de um ${(mode.leadLabel ?? 'líder').toLowerCase()} e ainda não tem um. Escolha quem ocupa o papel antes de rodar o laço.`
        : ''
    ),
    roster.length > 0 ? joinBlocks(heading(2, 'The team'), bullets(roster)) : '',
    'Cada nome entre crases é um subagente em `.claude/agents/`. Invoque pelo nome para delegar.',
    loopSection(team, living, slugs),
    missing > 0
      ? `> ${missing === 1 ? 'Uma mesa deste time estava vazia' : `${missing} mesas deste time estavam vazias`} na exportação: o agente foi excluído do navegador de origem, então não há subagente para ele aqui.`
      : '',
    joinBlocks(
      heading(2, 'Files'),
      bullets([
        '`.claude/agents/` — um arquivo por agente do time. É o que o Claude Code lê como subagente.',
        '`TEAM.md` — o time como documento único, para ler ou anexar.',
        '`team.json` — a mesma configuração legível por máquina.',
        '`agents/` — o `config.json` de cada agente, para reabrir ou versionar.',
      ])
    )
  )}\n`
}

/**
 * The machine-readable twin of the team.
 * @param {import('./types.js').Team} team
 * @param {TeamSeat[]} allSeats
 * @returns {string}
 */
export function generateTeamJson(team, allSeats) {
  const slugs = seatSlugs(allSeats)

  const config = {
    schemaVersion: TEAM_SCHEMA_VERSION,
    name: team.name,
    goal: team.objective,
    mode: team.mode,
    lead: team.leadId ? (slugs.get(team.leadId) ?? null) : null,
    leadRole: getTeamMode(team.mode).lead,
    sequential: getTeamMode(team.mode).sequential,
    loop: {
      maxIterations: LOOP_CEILING,
      stop: getTeamMode(team.mode).lead ?? 'all-assignments-done',
    },
    members: allSeats.map((seat) => ({
      agent: slugs.get(seat.member.agentId) ?? '',
      name: seat.agent?.name ?? '',
      assignment: seat.member.instruction,
      available: seat.agent !== undefined,
    })),
  }

  return `${JSON.stringify(config, null, 2)}\n`
}

/**
 * Every file the kit contains.
 * @param {import('./types.js').Team} team
 * @param {TeamSeat[]} allSeats
 * @returns {ExportFile[]}
 */
export function buildTeamFileTree(team, allSeats) {
  const living = livingSeats(allSeats)
  const slugs = seatSlugs(allSeats)

  return [
    { path: 'CLAUDE.md', content: generateTeamClaudeMarkdown(team, allSeats) },
    { path: 'TEAM.md', content: generateTeamMarkdown(team, allSeats) },
    { path: 'team.json', content: generateTeamJson(team, allSeats) },
    ...living.map((seat) => ({
      path: `.claude/agents/${slugs.get(seat.member.agentId)}.md`,
      content: subagentFile(team, seat, slugs),
    })),
    // The agent's own config travels too, so a team can be taken apart back into
    // the agents it was made of without going through the studio again.
    ...living.map((seat) => ({
      path: `agents/${slugs.get(seat.member.agentId)}.json`,
      content: generateConfigJson(seat.agent),
    })),
  ]
}

/**
 * @param {import('./types.js').Team} team
 * @returns {string}
 */
export function teamRootName(team) {
  return slugify(team.name, 'meu-time')
}
