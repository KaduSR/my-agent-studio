// @ts-check
/**
 * The saved-team store.
 *
 * Backed by localStorage under `agent-studio:teams`, and defensive on read the
 * same way library-store is: anything that fails to look like a Team is dropped
 * rather than allowed to crash the list.
 *
 * The mutators are the only place team invariants are enforced, which is why
 * they all funnel through `patchTeam`. A view that reached in and spliced
 * `members` itself could leave `managerId` pointing at somebody who left, and
 * every consumer downstream would have to defend against it.
 */

import { createStore } from '../lib/store.js'
import { readJSON, writeJSON, STORAGE_KEYS } from '../lib/storage.js'
import { debounce } from '../lib/debounce.js'
import { logger } from '../lib/logger.js'
import { trackEvent } from '../lib/analytics.js'
import { showToast } from '../ui/toast.js'
import {
  DEFAULT_TEAM_MODE,
  TEAM_LIMITS,
  createEmptyTeam,
  createTeamMember,
  isTeamMode,
  modeNeedsLead,
} from '../team/defaults.js'
import { getTeamTemplate } from '../data/team-templates.js'
import { createAgentFromTemplate } from '../agent/defaults.js'
import { saveAgent } from './library-store.js'

/**
 * @typedef {Object} TeamsState
 * @property {import('../team/types.js').Team[]} teams
 * @property {boolean} loaded
 */

/** @type {import('../lib/store.js').Store<TeamsState>} */
export const teamsStore = createStore(/** @type {TeamsState} */ ({ teams: [], loaded: false }))

/**
 * @param {unknown} value
 * @returns {string}
 */
function asText(value) {
  return typeof value === 'string' ? value : ''
}

/**
 * Coerce a stored member record, or null when there is nothing usable in it.
 * @param {unknown} raw
 * @returns {import('../team/types.js').TeamMember | null}
 */
function reviveMember(raw) {
  if (typeof raw !== 'object' || raw === null) return null
  const record = /** @type {Record<string, unknown>} */ (raw)
  if (typeof record.agentId !== 'string' || record.agentId.length === 0) return null
  return createTeamMember(record.agentId, asText(record.instruction))
}

/**
 * Coerce a stored record into a complete Team.
 *
 * This is the migration seam, and the place the invariants are re-established
 * after a round trip through storage: a record hand-edited in devtools, written
 * by an older version, or truncated by a full quota all come back through here.
 *
 * A member whose agent no longer exists is deliberately *kept*. Pruning here
 * would delete the order someone wrote for that agent, silently, on the next
 * load. The office shows it as an empty chair instead, which is recoverable.
 *
 * @param {unknown} raw
 * @returns {import('../team/types.js').Team | null}
 */
export function reviveTeam(raw) {
  if (typeof raw !== 'object' || raw === null) return null
  const record = /** @type {Record<string, unknown>} */ (raw)
  if (typeof record.id !== 'string' || record.id.length === 0) return null

  const base = createEmptyTeam()

  /** @type {import('../team/types.js').TeamMember[]} */
  const members = []
  const seen = new Set()
  for (const entry of Array.isArray(record.members) ? record.members : []) {
    const member = reviveMember(entry)
    if (!member || seen.has(member.agentId)) continue
    if (members.length >= TEAM_LIMITS.maxMembers) break
    seen.add(member.agentId)
    members.push(member)
  }

  /*
   * `managerId` is the pre-rename name. Teams saved before the evaluator mode
   * existed still carry it, and dropping it would silently un-promote whoever
   * was in charge, with nothing to notice.
   */
  const claimed = typeof record.leadId === 'string' ? record.leadId : record.managerId
  const leadId = typeof claimed === 'string' && seen.has(claimed) ? claimed : null

  return {
    id: record.id,
    name: asText(record.name),
    objective: asText(record.objective),
    mode: isTeamMode(record.mode) ? record.mode : DEFAULT_TEAM_MODE,
    leadId,
    members,
    createdAt: asText(record.createdAt) || base.createdAt,
    updatedAt: asText(record.updatedAt) || base.updatedAt,
  }
}

/** How long the office may run ahead of localStorage. Matches AUTOSAVE_DELAY. */
const PERSIST_DELAY = 500

/**
 * @param {import('../team/types.js').Team[]} teams
 * @returns {import('../lib/storage.js').WriteResult}
 */
function persist(teams) {
  return writeJSON(STORAGE_KEYS.teams, teams)
}

/**
 * A quota error is the one storage failure the user can act on, so it gets the
 * same wording the agent autosave uses rather than a generic apology.
 * @param {import('../lib/storage.js').WriteResult} result
 * @returns {void}
 */
function reportWriteFailure(result) {
  if (result.ok) return
  showToast({
    message:
      result.reason === 'quota'
        ? 'Armazenamento cheio. Exporte seu time para não perder alterações.'
        : 'Não foi possível salvar o time automaticamente. Exporte para evitar perder alterações.',
    variant: 'error',
  })
}

/**
 * Typing in the office updates state immediately and reaches localStorage a beat
 * later. Keeping the two apart is what lets the export blockers and the desk
 * previews read fresh values on every keystroke without a disk write per key.
 */
const persistLater = debounce(() => {
  reportWriteFailure(persist(teamsStore.getState().teams))
}, PERSIST_DELAY)

/**
 * Write anything still pending. The office view calls this in `destroy`: the
 * agent autosave can afford to `cancel` on teardown because it is never torn
 * down, but this view is destroyed on every navigation, and cancelling there
 * would drop the last thing typed.
 * @returns {void}
 */
export function flushTeamWrites() {
  persistLater.flush()
}

/**
 * Load the teams from storage. Safe to call more than once.
 * @returns {import('../team/types.js').Team[]}
 */
export function loadTeams() {
  const raw = readJSON(STORAGE_KEYS.teams, /** @type {unknown[]} */ ([]))
  const teams = Array.isArray(raw)
    ? raw
        .map(reviveTeam)
        .filter(/** @returns {t is import('../team/types.js').Team} */ (t) => t !== null)
    : []

  if (Array.isArray(raw) && teams.length !== raw.length) {
    logger.warn(`Dropped ${raw.length - teams.length} unreadable team record(s)`)
  }

  teamsStore.setState({ teams, loaded: true })
  return teams
}

/**
 * Most recently edited first, like listAgents.
 * @returns {import('../team/types.js').Team[]}
 */
export function listTeams() {
  return [...teamsStore.getState().teams].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/**
 * @param {string} id
 * @returns {import('../team/types.js').Team | undefined}
 */
export function getTeam(id) {
  return teamsStore.getState().teams.find((team) => team.id === id)
}

/**
 * Insert or replace a team, stamping `updatedAt`.
 * @param {import('../team/types.js').Team} team
 * @returns {import('../lib/storage.js').WriteResult}
 */
export function saveTeam(team) {
  const stamped = { ...team, updatedAt: new Date().toISOString() }
  const teams = [...teamsStore.getState().teams]
  const index = teams.findIndex((candidate) => candidate.id === stamped.id)
  if (index === -1) teams.push(stamped)
  else teams[index] = stamped

  teamsStore.setState({ teams })
  return persist(teams)
}

/**
 * @param {string} id
 * @returns {import('../lib/storage.js').WriteResult}
 */
export function deleteTeam(id) {
  const teams = teamsStore.getState().teams.filter((team) => team.id !== id)
  teamsStore.setState({ teams })
  trackEvent('team_deleted', { teamId: id })
  return persist(teams)
}

/**
 * Build a ready-made team, and the agents it is made of.
 *
 * A team template names agent templates, so this mints a real agent from each
 * one and saves it to the library before seating it. That is the honest thing
 * for a screen whose whole premise is that a team is made of *your* agents: the
 * four that arrive are yours, editable in the builder like any other, and the
 * team holds references to them rather than a private copy.
 *
 * Asking for the same example twice gives a second, independent copy, exactly as
 * asking for the same agent template twice does.
 *
 * @param {string} templateId
 * @returns {import('../team/types.js').Team | null}
 */
export function createTeamFromTemplate(templateId) {
  const template = getTeamTemplate(templateId)
  if (!template) {
    logger.warn(`Unknown team template: ${templateId}`)
    return null
  }

  /** @type {import('../team/types.js').TeamMember[]} */
  const members = []
  /** @type {string | null} */
  let leadId = null

  for (const entry of template.members.slice(0, TEAM_LIMITS.maxMembers)) {
    const agent = createAgentFromTemplate(entry.template)
    saveAgent(agent)
    members.push(createTeamMember(agent.id, entry.instruction))
    if (entry.template === template.lead) leadId = agent.id
  }

  const team = createEmptyTeam({
    name: template.label,
    objective: template.objective,
    mode: template.mode,
    leadId: modeNeedsLead(template.mode) ? leadId : null,
    members,
  })

  saveTeam(team)
  trackEvent('team_created', { template: templateId })
  return team
}

/**
 * The single funnel for every change to a stored team.
 *
 * A mutator that returns the team it was given vetoes the change, which is how
 * "already seated" and "roster full" stay silent no-ops instead of writes that
 * only look like they did something. Mirrors `patchAgent` in builder-store.js.
 *
 * @param {string} id
 * @param {(team: import('../team/types.js').Team) => import('../team/types.js').Team} mutator
 * @returns {import('../team/types.js').Team | null} null when nothing changed.
 */
function patchTeam(id, mutator) {
  const current = getTeam(id)
  if (!current) return null

  const next = mutator(current)
  if (next === current) return null

  const stamped = { ...next, updatedAt: new Date().toISOString() }
  teamsStore.setState({
    teams: teamsStore.getState().teams.map((team) => (team.id === id ? stamped : team)),
  })
  persistLater()
  return stamped
}

/**
 * @param {string} id
 * @param {Partial<Pick<import('../team/types.js').Team, 'name' | 'objective'>>} fields
 * @returns {import('../team/types.js').Team | null}
 */
export function updateTeamFields(id, fields) {
  return patchTeam(id, (team) => ({ ...team, ...fields }))
}

/**
 * Seat an agent. Refuses a duplicate and refuses to go past the ceiling.
 * @param {string} id
 * @param {string} agentId
 * @returns {import('../team/types.js').Team | null}
 */
export function addMember(id, agentId) {
  return patchTeam(id, (team) => {
    if (team.members.length >= TEAM_LIMITS.maxMembers) return team
    if (team.members.some((member) => member.agentId === agentId)) return team

    const members = [...team.members, createTeamMember(agentId)]
    return {
      ...team,
      members,
      // A mode that needs a lead and has nobody in it is a broken team, so the
      // first agent to sit down takes the chair rather than leaving the choice
      // pending behind a warning.
      leadId: modeNeedsLead(team.mode) && team.leadId === null ? agentId : team.leadId,
    }
  })
}

/**
 * @param {string} id
 * @param {string} agentId
 * @returns {import('../team/types.js').Team | null}
 */
export function removeMember(id, agentId) {
  return patchTeam(id, (team) => {
    const members = team.members.filter((member) => member.agentId !== agentId)
    if (members.length === team.members.length) return team
    return {
      ...team,
      members,
      // The lead cannot be somebody who left the team.
      leadId: team.leadId === agentId ? null : team.leadId,
    }
  })
}

/**
 * @param {string} id
 * @param {string} agentId
 * @param {string} instruction
 * @returns {import('../team/types.js').Team | null}
 */
export function setMemberInstruction(id, agentId, instruction) {
  return patchTeam(id, (team) => {
    let changed = false
    const members = team.members.map((member) => {
      if (member.agentId !== agentId || member.instruction === instruction) return member
      changed = true
      return { ...member, instruction }
    })
    return changed ? { ...team, members } : team
  })
}

/**
 * @param {string} id
 * @param {import('../team/types.js').TeamMode} mode
 * @returns {import('../team/types.js').Team | null}
 */
export function setTeamMode(id, mode) {
  return patchTeam(id, (team) => {
    if (team.mode === mode) return team

    // Switching into a mode that needs a lead, with nobody promoted, picks the
    // first desk. It is deterministic, it is one click to change, and it means
    // the mode is never half-applied. Switching to a mode with no lead keeps
    // leadId: going and coming back must not cost the choice.
    const leadId =
      modeNeedsLead(mode) && team.leadId === null
        ? (team.members[0]?.agentId ?? null)
        : team.leadId

    return { ...team, mode, leadId }
  })
}

/**
 * Hand the singled-out seat to a member. Refuses an agent who is not seated.
 * @param {string} id
 * @param {string} agentId
 * @returns {import('../team/types.js').Team | null}
 */
export function setLead(id, agentId) {
  return patchTeam(id, (team) => {
    if (team.leadId === agentId) return team
    if (!team.members.some((member) => member.agentId === agentId)) return team
    return { ...team, leadId: agentId }
  })
}

/**
 * Move a desk one place along, which is what makes `chain` mode usable: under it
 * the desk order is the running order.
 * @param {string} id
 * @param {string} agentId
 * @param {number} delta
 * @returns {import('../team/types.js').Team | null}
 */
export function moveMember(id, agentId, delta) {
  return patchTeam(id, (team) => {
    const from = team.members.findIndex((member) => member.agentId === agentId)
    if (from === -1) return team

    const to = from + delta
    if (to < 0 || to >= team.members.length) return team

    const members = [...team.members]
    const [moved] = members.splice(from, 1)
    members.splice(to, 0, moved)
    return { ...team, members }
  })
}
