// @ts-check
/**
 * Team Markdown generation.
 *
 * Pure, like the agent's: the Team object is the source, and the document is
 * derived on demand rather than stored. Section headings stay in English for the
 * same reason they do in agent/markdown.js, since the two documents get pasted
 * into the same tool and would look half-translated side by side.
 *
 * Members appear by reference, not embedded. Each agent already exports its own
 * document, and inlining eight of them would bury the thing this file is for,
 * which is who does what and who answers for the result.
 */

import { bullets, heading, joinBlocks, numbered } from '../agent/markdown.js'
import { activeLead } from './defaults.js'
import { getTeamMode } from '../data/team-modes.js'

/** What an unresolvable seat is called in the document. */
const MISSING_AGENT = '(agente indisponível)'

/**
 * @typedef {Object} TeamSeat
 * @property {import('./types.js').TeamMember} member
 * @property {import('../agent/types.js').Agent | undefined} agent
 */

/**
 * Pair each member with its agent, in desk order.
 *
 * The lookup is passed in rather than imported so this module stays pure and
 * testable in node, with no store behind it.
 *
 * @param {import('./types.js').Team} team
 * @param {(agentId: string) => import('../agent/types.js').Agent | undefined} lookup
 * @returns {TeamSeat[]}
 */
export function resolveSeats(team, lookup) {
  return team.members.map((member) => ({ member, agent: lookup(member.agentId) }))
}

/**
 * @param {TeamSeat} seat
 * @returns {string}
 */
function seatName(seat) {
  return seat.agent?.name.trim() || MISSING_AGENT
}

/**
 * @param {import('./types.js').Team} team
 * @param {number} [level]
 * @returns {string}
 */
export function purposeSection(team, level = 2) {
  const objective = team.objective.trim()
  if (!objective) return ''
  return joinBlocks(heading(level, 'Purpose'), objective)
}

/**
 * How the team works, said in prose, because a mode id means nothing to a model
 * reading this cold.
 * @param {import('./types.js').Team} team
 * @param {TeamSeat[]} seats
 * @param {number} [level]
 * @returns {string}
 */
export function modeSection(team, seats, level = 2) {
  const mode = getTeamMode(team.mode)
  const lead = leadSeat(team, seats)
  const role = (mode.leadLabel ?? 'Líder').toLowerCase()

  return joinBlocks(
    heading(level, 'How the team works'),
    mode.summary,
    !mode.lead
      ? ''
      : lead
        ? `Quem ocupa esse papel neste time é **${seatName(lead)}**.`
        : `Este time ainda não tem ${role} definido. Escolha quem ocupa o papel antes de usar este documento.`
  )
}

/**
 * The seat the current mode singles out, resolved against the roster.
 * @param {import('./types.js').Team} team
 * @param {TeamSeat[]} seats
 * @returns {TeamSeat | undefined}
 */
function leadSeat(team, seats) {
  const lead = activeLead(team)
  return lead ? seats.find((seat) => seat.member.agentId === lead.agentId) : undefined
}

/**
 * @param {TeamSeat[]} seats
 * @param {number} [level]
 * @returns {string}
 */
export function rosterSection(seats, level = 2) {
  if (seats.length === 0) return ''

  const lines = seats.map((seat) => {
    const objective = seat.agent?.objective.trim() || seat.agent?.description?.trim()
    return objective ? `**${seatName(seat)}**: ${objective}` : `**${seatName(seat)}**`
  })

  return joinBlocks(heading(level, 'Team'), bullets(lines))
}

/**
 * What each agent was told to do, in desk order.
 *
 * A seat with nothing written is left out rather than emitted empty, the same
 * choice `orderedRuleTexts` makes for a blank rule. The heading follows the mode,
 * because "Orders" and "Steps" are not the same promise: under `chain` the
 * numbers are a sequence, under `orders` they are just a list.
 *
 * @param {import('./types.js').Team} team
 * @param {TeamSeat[]} seats
 * @param {number} [level]
 * @returns {string}
 */
export function ordersSection(team, seats, level = 2) {
  const sequential = getTeamMode(team.mode).sequential
  const lines = seats
    .filter((seat) => seat.member.instruction.trim().length > 0)
    .map((seat) => `**${seatName(seat)}**: ${seat.member.instruction.trim()}`)

  if (lines.length === 0) return ''
  return joinBlocks(heading(level, sequential ? 'Steps' : 'Orders'), numbered(lines))
}

/**
 * The section a mode with a lead gets instead of a flat list: the singled-out
 * seat and its brief, then everybody else.
 *
 * @param {import('./types.js').Team} team
 * @param {TeamSeat[]} seats
 * @param {number} [level]
 * @returns {string}
 */
export function coordinationSection(team, seats, level = 2) {
  const mode = getTeamMode(team.mode)
  const lead = leadSeat(team, seats)
  if (!lead) return ''

  const rest = seats.filter((seat) => seat.member.agentId !== lead.member.agentId)
  const brief = lead.member.instruction.trim()

  const restLines = rest.map((seat) => {
    const remit = seat.member.instruction.trim()
    return remit ? `**${seatName(seat)}**: ${remit}` : `**${seatName(seat)}**`
  })

  const isReviewer = mode.lead === 'reviewer'

  return joinBlocks(
    joinBlocks(
      heading(level, isReviewer ? 'Review' : 'Coordination'),
      `**${mode.leadLabel}:** ${seatName(lead)}`,
      brief
    ),
    restLines.length > 0
      ? joinBlocks(heading(level + 1, isReviewer ? 'Producers' : 'Specialists'), bullets(restLines))
      : ''
  )
}

/**
 * The whole team document.
 * @param {import('./types.js').Team} team
 * @param {TeamSeat[]} seats
 * @returns {string}
 */
export function generateTeamMarkdown(team, seats) {
  const missing = seats.filter((seat) => !seat.agent).length

  return `${joinBlocks(
    heading(1, team.name.trim() || 'Time sem nome'),
    purposeSection(team, 2),
    modeSection(team, seats, 2),
    rosterSection(seats, 2),
    getTeamMode(team.mode).lead
      ? coordinationSection(team, seats, 2)
      : ordersSection(team, seats, 2),
    missing > 0
      ? `> ${missing === 1 ? 'Uma mesa ficou vazia: o agente foi excluído' : `${missing} mesas ficaram vazias: os agentes foram excluídos`} deste navegador.`
      : '',
    '> Cada agente deste time tem o próprio documento, exportado na tela do agente.'
  ).trim()}\n`
}

/**
 * The paste-ready version, in the shape `generateCreationPrompt` established:
 * a comment saying where to paste, the framing sentence, the instructions, and
 * the document inside a delimiter so the model can see where it ends.
 *
 * @param {import('./types.js').Team} team
 * @param {TeamSeat[]} seats
 * @returns {string}
 */
export function generateTeamPrompt(team, seats) {
  const name = team.name.trim() || 'Time sem nome'
  // The instructions are the mode's own loop, so the pasted prompt and the kit's
  // CLAUDE.md tell the model to do the same thing.
  const steps = getTeamMode(team.mode).loop

  return `<!--
  Como usar: cole no Claude Code, no ChatGPT ou no Gemini e comece a conversa.
  Gerado pelo My Agent Studio.
-->

Você vai conduzir o time "${name}", descrito entre <time> e </time>.

${steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

<time>
${generateTeamMarkdown(team, seats).trim()}
</time>
`
}
