// @ts-check
/**
 * Getting a team out of the browser.
 *
 * Thin on purpose: `copyText` and `downloadBlob` are already generic in
 * agent/export.js, and the team domain depends on the agent domain everywhere
 * else too, so this file is the team-shaped names over those two.
 *
 * There is no team JSON. A team is a list of agent ids, and those ids do not
 * exist in another browser: an imported agent is minted with a fresh id, so the
 * references could never re-bind. A backup worth having would have to carry the
 * agents themselves and remap every reference on the way in, which is its own
 * feature rather than a button.
 */

import { copyText, downloadBlob } from '../agent/export.js'
import { createZip } from '../lib/zip.js'
import { slugify } from '../lib/uuid.js'
import { trackEvent } from '../lib/analytics.js'
import { generateTeamMarkdown, generateTeamPrompt } from './markdown.js'
import { buildTeamFileTree, teamRootName } from './files.js'
import { getTeamMode } from '../data/team-modes.js'

/**
 * @param {import('./types.js').Team} team
 * @returns {string}
 */
function teamFilename(team) {
  return `${slugify(team.name, 'meu-time')}.md`
}

/**
 * @param {import('./types.js').Team} team
 * @param {import('./markdown.js').TeamSeat[]} seats
 * @returns {Promise<boolean>}
 */
export async function copyTeamMarkdown(team, seats) {
  const ok = await copyText(generateTeamMarkdown(team, seats))
  if (ok) trackEvent('team_exported', { teamId: team.id, format: 'markdown' })
  return ok
}

/**
 * @param {import('./types.js').Team} team
 * @param {import('./markdown.js').TeamSeat[]} seats
 * @returns {void}
 */
export function downloadTeamMarkdown(team, seats) {
  downloadBlob(teamFilename(team), generateTeamMarkdown(team, seats), 'text/markdown;charset=utf-8')
  trackEvent('team_exported', { teamId: team.id, format: 'file' })
}

/**
 * @param {import('./types.js').Team} team
 * @param {import('./markdown.js').TeamSeat[]} seats
 * @returns {Promise<boolean>}
 */
export async function copyTeamPrompt(team, seats) {
  const ok = await copyText(generateTeamPrompt(team, seats))
  if (ok) trackEvent('team_exported', { teamId: team.id, format: 'prompt' })
  return ok
}

/**
 * The kit: the folder a repository carries, zipped.
 *
 * This is the export that actually runs. The other two describe the team; this
 * one drops into a project as `CLAUDE.md` plus a subagent per member under
 * `.claude/agents/`, with the loop and its stopping condition written down.
 *
 * @param {import('./types.js').Team} team
 * @param {import('./markdown.js').TeamSeat[]} seats
 * @returns {Promise<void>}
 */
export async function downloadTeamKit(team, seats) {
  const root = teamRootName(team)
  const files = buildTeamFileTree(team, seats)

  const bytes = await createZip(
    files.map((file) => ({ path: `${root}/${file.path}`, content: file.content }))
  )

  downloadBlob(`${root}.zip`, bytes, 'application/zip')
  trackEvent('team_exported', { teamId: team.id, format: 'kit', files: files.length })
}

/**
 * What still has to happen before the document is worth pasting anywhere.
 *
 * Same shape as `getExportBlockers` for an agent: a list of sentences, shown to
 * the user, rather than a boolean that leaves them guessing at a dim button.
 *
 * @param {import('./types.js').Team} team
 * @returns {string[]}
 */
export function getTeamExportBlockers(team) {
  /** @type {string[]} */
  const blockers = []

  if (team.name.trim().length < 2) blockers.push('Dê um nome ao time.')
  if (team.objective.trim().length === 0) blockers.push('Escreva o objetivo do time.')
  if (team.members.length === 0) blockers.push('Sente pelo menos um agente em uma mesa.')

  const mode = getTeamMode(team.mode)
  if (mode.lead && team.leadId === null) {
    blockers.push(`Escolha qual agente é o ${(mode.leadLabel ?? 'líder').toLowerCase()}.`)
  }

  return blockers
}

/**
 * @param {import('./types.js').Team} team
 * @returns {boolean}
 */
export function canExportTeam(team) {
  return getTeamExportBlockers(team).length === 0
}
