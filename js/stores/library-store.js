// @ts-check
/**
 * The saved-agent library (SPEC 93, ADR-001).
 *
 * Backed by localStorage under `agent-studio:agents`. Reads are defensive:
 * anything that fails to look like an Agent is dropped rather than allowed to
 * crash the list.
 */

import { createStore } from '../lib/store.js'
import { readJSON, writeJSON, STORAGE_KEYS } from '../lib/storage.js'
import { logger } from '../lib/logger.js'
import { trackEvent } from '../lib/analytics.js'
import { createEmptyAgent, duplicateAgent } from '../agent/defaults.js'
import { mergeToolCatalogue } from '../agent/tool-catalogue.js'

/**
 * @typedef {Object} LibraryState
 * @property {import('../agent/types.js').Agent[]} agents
 * @property {boolean} loaded
 */

/** @type {import('../lib/store.js').Store<LibraryState>} */
export const libraryStore = createStore(
  /** @type {LibraryState} */ ({ agents: [], loaded: false })
)

/**
 * Coerce a stored record into a complete Agent, filling in anything an older
 * version may not have written.
 *
 * This is the migration seam. Everything read back from storage has to pass
 * through here — including the draft — or a renamed field silently comes back
 * empty instead of failing loudly.
 *
 * @param {unknown} raw
 * @returns {import('../agent/types.js').Agent | null}
 */
export function reviveAgent(raw) {
  if (typeof raw !== 'object' || raw === null) return null
  const record = /** @type {Record<string, unknown>} */ (raw)
  if (typeof record.id !== 'string' || record.id.length === 0) return null

  const base = createEmptyAgent()
  const agent = {
    ...base,
    ...record,
    id: record.id,
    soul: { ...base.soul, ...(typeof record.soul === 'object' && record.soul ? record.soul : {}) },
    personality: {
      ...base.personality,
      ...(typeof record.personality === 'object' && record.personality ? record.personality : {}),
    },
    memory: {
      ...base.memory,
      ...(typeof record.memory === 'object' && record.memory ? record.memory : {}),
      // Agents saved before the memory kinds existed have no such key, and the
      // step would read `undefined.includes` on open.
      kinds: Array.isArray(/** @type {any} */ (record.memory)?.kinds)
        ? /** @type {any} */ (record.memory).kinds
        : base.memory.kinds,
    },
    // `hardRules` is the pre-rename name. Agents saved before Guard Rails
    // existed still carry it, and dropping it would make their rules vanish
    // from the UI without any error to notice.
    guardRails: Array.isArray(record.guardRails)
      ? record.guardRails
      : Array.isArray(record.hardRules)
        ? record.hardRules
        : base.guardRails,
    // Reconciled against the catalogue that ships today, not trusted as written:
    // an agent saved when there were ten tools has to gain the ones added since,
    // and it would otherwise never see them.
    tools: Array.isArray(record.tools) && record.tools.length > 0
      ? mergeToolCatalogue(record.tools)
      : base.tools,
    // Every agent saved before the Knowledge step existed has no such key, and
    // without this default the step would read `undefined.length` on open.
    knowledge: Array.isArray(record.knowledge) ? record.knowledge : base.knowledge,
  }

  // The legacy key must not survive into the new record, or it would be written
  // straight back to storage on the next autosave.
  delete (/** @type {Record<string, unknown>} */ (agent)).hardRules

  return /** @type {import('../agent/types.js').Agent} */ (agent)
}

/**
 * @param {import('../agent/types.js').Agent[]} agents
 * @returns {import('../lib/storage.js').WriteResult}
 */
function persist(agents) {
  return writeJSON(STORAGE_KEYS.agents, agents)
}

/**
 * Load the library from storage. Safe to call more than once.
 * @returns {import('../agent/types.js').Agent[]}
 */
export function loadLibrary() {
  const raw = readJSON(STORAGE_KEYS.agents, /** @type {unknown[]} */ ([]))
  const agents = Array.isArray(raw)
    ? raw.map(reviveAgent).filter(/** @returns {a is import('../agent/types.js').Agent} */ (a) => a !== null)
    : []

  if (Array.isArray(raw) && agents.length !== raw.length) {
    logger.warn(`Dropped ${raw.length - agents.length} unreadable agent record(s)`)
  }

  libraryStore.setState({ agents, loaded: true })
  return agents
}

/**
 * Most recently edited first (SPEC 93).
 * @returns {import('../agent/types.js').Agent[]}
 */
export function listAgents() {
  return [...libraryStore.getState().agents].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  )
}

/**
 * @param {string} id
 * @returns {import('../agent/types.js').Agent | undefined}
 */
export function getAgent(id) {
  return libraryStore.getState().agents.find((agent) => agent.id === id)
}

/**
 * Insert or replace an agent.
 * @param {import('../agent/types.js').Agent} agent
 * @returns {import('../lib/storage.js').WriteResult}
 */
export function saveAgent(agent) {
  const agents = [...libraryStore.getState().agents]
  const index = agents.findIndex((candidate) => candidate.id === agent.id)
  if (index === -1) agents.push(agent)
  else agents[index] = agent

  libraryStore.setState({ agents })
  return persist(agents)
}

/**
 * @param {string} id
 * @returns {import('../lib/storage.js').WriteResult}
 */
export function deleteAgent(id) {
  const agents = libraryStore.getState().agents.filter((agent) => agent.id !== id)
  libraryStore.setState({ agents })
  trackEvent('agent_deleted', { agentId: id })
  return persist(agents)
}

/**
 * @param {string} id
 * @returns {import('../agent/types.js').Agent | null}
 */
export function duplicateAgentById(id) {
  const source = getAgent(id)
  if (!source) return null

  const copy = duplicateAgent(source)
  saveAgent(copy)
  trackEvent('agent_duplicated', { agentId: id, copyId: copy.id })
  return copy
}
