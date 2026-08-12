// @ts-check
/**
 * Factory functions and limits for teams.
 *
 * Same contract as agent/defaults.js: everything here returns a complete Team,
 * so no consumer has to defend against a half-built one.
 *
 * The modes themselves live in data/team-modes.js, with every label, caption and
 * loop step beside the id. They are re-exported here only so the rest of the
 * team domain has one import to reach for.
 */

import { uuid } from '../lib/uuid.js'
import { DEFAULT_TEAM_MODE, TEAM_MODE_IDS, isTeamMode, modeNeedsLead } from '../data/team-modes.js'

export { DEFAULT_TEAM_MODE, TEAM_MODE_IDS, isTeamMode, modeNeedsLead }

/**
 * Structural limits only. The field lengths live in agent/validate.js with every
 * other field length, so `textField({ validateAs: 'teamName' })` keeps working
 * without this module importing upwards into the agent domain.
 */
export const TEAM_LIMITS = Object.freeze({
  /*
   * Eight desks is what the 1120px content column holds legibly: four across,
   * two rows, with the name and the order still readable under each sprite. It
   * is also what keeps the exported document short enough that someone pastes it
   * without scrolling past the roster.
   */
  maxMembers: 8,
})

/**
 * @param {string} agentId
 * @param {string} [instruction]
 * @returns {import('./types.js').TeamMember}
 */
export function createTeamMember(agentId, instruction = '') {
  return { agentId, instruction }
}

/**
 * @param {Partial<import('./types.js').Team>} [overrides]
 * @returns {import('./types.js').Team}
 */
export function createEmptyTeam(overrides = {}) {
  const now = new Date().toISOString()
  return {
    id: uuid(),
    name: '',
    objective: '',
    mode: DEFAULT_TEAM_MODE,
    leadId: null,
    members: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/**
 * The singled-out seat, or null when nobody holds it.
 *
 * Reads `leadId` back through `members` rather than trusting it on its own: the
 * store keeps the two in step, and this is the assertion that says so at every
 * call site.
 *
 * @param {import('./types.js').Team} team
 * @returns {import('./types.js').TeamMember | null}
 */
export function teamLead(team) {
  if (!team.leadId) return null
  return team.members.find((member) => member.agentId === team.leadId) ?? null
}

/**
 * The lead only counts when the current mode has one. A team that was managed
 * and is now a plain list of orders still remembers who was in charge, and must
 * not draw a head desk for them.
 *
 * @param {import('./types.js').Team} team
 * @returns {import('./types.js').TeamMember | null}
 */
export function activeLead(team) {
  return modeNeedsLead(team.mode) ? teamLead(team) : null
}

/**
 * @param {import('./types.js').Team} team
 * @param {string} agentId
 * @returns {boolean}
 */
export function hasMember(team, agentId) {
  return team.members.some((member) => member.agentId === agentId)
}
