// @ts-check
/**
 * Agent JSON: the file that leaves the studio and can come back.
 *
 * This is deliberately *not* `config.json`. That file (agent/files.js) is a
 * derived, flattened view meant for whatever tool runs the agent: it drops
 * disabled tools and turns rules into plain strings, so reading it back would
 * silently lose configuration the user had filled in. This module round-trips
 * the editable state instead — every step, exactly as the builder holds it.
 *
 * Import is defensive on purpose. The file may have been hand-edited, produced
 * by an older version, or be a `config.json` someone tried anyway, so every
 * value is coerced against the same catalogues the UI offers. An id that does
 * not exist is dropped rather than carried into state where it would render as
 * a blank chip nobody can remove.
 */

import { createEmptyAgent, createKnowledgeDoc, createRule } from './defaults.js'
import { mergeToolCatalogue } from './tool-catalogue.js'
import { LIMITS } from './validate.js'
import { getKnowledgeEntry } from '../data/knowledge-library.js'
import { TONES, MAX_TONES } from '../data/tones.js'
import { TRAITS, MAX_TRAITS } from '../data/traits.js'
import { RESPONSE_STYLES } from '../data/response-styles.js'
import { SOUL_VALUES } from '../data/soul-values.js'
import { ALWAYS_MEMORY_KINDS, MEMORY_KINDS, MEMORY_REMEMBER_OPTIONS, MEMORY_TYPES } from '../data/memory.js'
import { SLIDER_IDS } from '../data/behavior-sliders.js'
import { AVATARS } from '../data/avatars.js'

/** Identifies our own files, so an unrelated JSON can be rejected politely. */
export const TRANSFER_KIND = 'my-agent-studio/agent'

/** Bump when the wrapper (not the agent) changes shape. */
export const TRANSFER_VERSION = 1

/** How many restrictions a single file may bring in. */
const MAX_RESTRICTIONS = 40

/**
 * @param {ReadonlyArray<{ id: string }>} catalogue
 * @returns {Set<string>}
 */
function idsOf(catalogue) {
  return new Set(catalogue.map((entry) => entry.id))
}

/**
 * @param {unknown} value
 * @param {number} max
 * @returns {string}
 */
function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

/**
 * Keep only known ids, without duplicates, up to a ceiling.
 * @param {unknown} value
 * @param {Set<string>} allowed
 * @param {number} [max]
 * @returns {string[]}
 */
function knownIds(value, allowed, max) {
  if (!Array.isArray(value)) return []
  const unique = [...new Set(value.filter((entry) => typeof entry === 'string'))]
  const valid = unique.filter((entry) => allowed.has(entry))
  return max === undefined ? valid : valid.slice(0, max)
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
function slider(value, fallback) {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(100, Math.max(0, Math.round(numeric)))
}

/**
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
function asRecord(value) {
  return typeof value === 'object' && value !== null ? /** @type {any} */ (value) : {}
}

/**
 * Rules arrive as `[{ text }]` from our own file and as `["..."]` from
 * config.json or a template. Both mean the same thing.
 * @param {unknown} value
 * @returns {string[]}
 */
function ruleTexts(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) =>
      typeof entry === 'string' ? entry : text(asRecord(entry).text, LIMITS.ruleMax)
    )
    .map((entry) => entry.trim().slice(0, LIMITS.ruleMax))
    .filter(Boolean)
    .slice(0, LIMITS.maxRules)
}

/**
 * Knowledge documents survive as their own text, not as catalogue references:
 * the user is expected to have edited them. `sourceId` is kept only when it
 * still resolves, so provenance never points at an entry that no longer exists.
 *
 * @param {unknown} value
 * @returns {import('./types.js').AgentKnowledge[]}
 */
function knowledgeDocs(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      const record = asRecord(entry)
      const title = text(record.title, LIMITS.knowledgeTitleMax)
      const content = text(record.content, LIMITS.knowledgeContentMax)
      const sourceId = text(record.sourceId, 60)
      return { title, content, sourceId }
    })
    .filter((doc) => doc.title.length > 0 && doc.content.length > 0)
    .slice(0, LIMITS.maxKnowledgeDocs)
    .map((doc, index) =>
      createKnowledgeDoc(
        doc.title,
        doc.content,
        index,
        getKnowledgeEntry(doc.sourceId) ? doc.sourceId : undefined
      )
    )
}

/**
 * Coerce anything into a complete, editable Agent.
 *
 * The id and timestamps are always minted fresh: importing is creating. Keeping
 * the id from the file would let a re-import silently overwrite the agent it
 * was exported from the moment autosave runs.
 *
 * @param {unknown} raw The agent object, already unwrapped.
 * @returns {import('./types.js').Agent}
 */
export function agentFromJson(raw) {
  const record = asRecord(raw)
  const base = createEmptyAgent()
  const soul = asRecord(record.soul)
  const personality = asRecord(record.personality)
  const memory = asRecord(record.memory)

  const avatarId = text(record.avatarId ?? record.avatar, 60)
  const memoryType = text(memory.type, 20)
  const responseStyle = text(personality.responseStyle, 40)

  const restrictions = Array.isArray(memory.restrictions)
    ? [...new Set(memory.restrictions.map((entry) => text(entry, LIMITS.restrictionMax)))]
        .filter(Boolean)
        .slice(0, MAX_RESTRICTIONS)
    : base.memory.restrictions

  const rules = ruleTexts(record.guardRails ?? record.hardRules ?? record.rules)

  return {
    ...base,
    name: text(record.name, LIMITS.nameMax),
    description: text(record.description, LIMITS.descriptionMax),
    objective: text(record.objective, LIMITS.objectiveMax),
    avatarId: idsOf(AVATARS).has(avatarId) ? avatarId : base.avatarId,
    soul: {
      mission: text(soul.mission, LIMITS.soulFieldMax),
      essence: text(soul.essence, LIMITS.soulFieldMax),
      philosophy: text(soul.philosophy, LIMITS.soulFieldMax),
      values: knownIds(soul.values, idsOf(SOUL_VALUES)),
    },
    personality: {
      tones: knownIds(personality.tones, idsOf(TONES), MAX_TONES),
      traits: knownIds(personality.traits, idsOf(TRAITS), MAX_TRAITS),
      responseStyle: idsOf(RESPONSE_STYLES).has(responseStyle) ? responseStyle : '',
      // A file written before a slider existed simply keeps that slider's
      // default, which is why every one of them is read through the catalogue.
      ...(/** @type {Record<import('../data/behavior-sliders.js').SliderId, number>} */ (
        Object.fromEntries(
          SLIDER_IDS.map((id) => [id, slider(personality[id], base.personality[id])])
        )
      )),
    },
    // Fresh ids, contiguous order: the file's own numbering is not trusted.
    guardRails: rules.length > 0 ? rules.map(createRule) : base.guardRails,
    tools: mergeToolCatalogue(record.tools),
    knowledge: knowledgeDocs(record.knowledge),
    memory: {
      type: /** @type {import('./types.js').MemoryType} */ (
        idsOf(MEMORY_TYPES).has(memoryType) ? memoryType : base.memory.type
      ),
      // The context window is always there, whatever the file says.
      kinds: [
        ...new Set([...ALWAYS_MEMORY_KINDS, ...knownIds(memory.kinds, idsOf(MEMORY_KINDS))]),
      ],
      remember: knownIds(memory.remember, idsOf(MEMORY_REMEMBER_OPTIONS)),
      restrictions,
    },
  }
}

/**
 * The file the export step writes.
 * @param {import('./types.js').Agent} agent
 * @returns {string}
 */
export function serializeAgent(agent) {
  return `${JSON.stringify(
    {
      kind: TRANSFER_KIND,
      version: TRANSFER_VERSION,
      exportedAt: new Date().toISOString(),
      agent,
    },
    null,
    2
  )}\n`
}

/** Keys that mark an object as describing an agent rather than something else. */
const AGENT_KEYS = ['name', 'objective', 'soul', 'personality', 'guardRails', 'hardRules', 'rules', 'tools', 'knowledge', 'memory']

/**
 * Read a file back into an Agent.
 *
 * Throws with a message meant to be shown to the user, since there is nothing
 * they can do about a stack trace.
 *
 * @param {string} json
 * @returns {import('./types.js').Agent}
 */
export function parseAgentJson(json) {
  /** @type {unknown} */
  let parsed
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Este arquivo não é um JSON válido.')
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Este arquivo não descreve um agente.')
  }

  const record = /** @type {Record<string, unknown>} */ (parsed)
  // Our own wrapper, a bare agent, and config.json all end up here.
  const candidate = asRecord(record.agent ?? record)

  if (!AGENT_KEYS.some((key) => key in candidate)) {
    throw new Error('Este arquivo não descreve um agente.')
  }

  return agentFromJson(candidate)
}
