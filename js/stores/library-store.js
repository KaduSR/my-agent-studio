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
 * Coerce a stored record into a complete Agent, filling in anything a older
 * version may not have written.
 * @param {unknown} raw
 * @returns {import('../agent/types.js').Agent | null}
 */
function reviveAgent(raw) {
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
    },
    hardRules: Array.isArray(record.hardRules) ? record.hardRules : base.hardRules,
    tools: Array.isArray(record.tools) && record.tools.length > 0 ? record.tools : base.tools,
  }

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
