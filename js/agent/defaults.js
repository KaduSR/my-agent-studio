// @ts-check
/**
 * Factory functions for new agents (SPEC 75, 76, 77).
 *
 * Everything here returns a fresh, fully-populated Agent so the rest of the app
 * never has to defend against half-built state.
 */

import { uuid } from '../lib/uuid.js'
import { defaultSliderValues } from '../data/behavior-sliders.js'
import { DEFAULT_AVATAR_ID } from '../data/avatars.js'
import { getTemplate } from '../data/templates.js'
import { getKnowledgeEntry } from '../data/knowledge-library.js'
import { createToolCatalogue } from './tool-catalogue.js'
import { LIMITS } from './validate.js'

/** SPEC 76. */
export const DEFAULT_GUARD_RAILS = Object.freeze([
  'Nunca invente informações.',
  'Se não souber algo, diga explicitamente.',
  'Priorize clareza e objetividade.',
  'Proteja informações privadas do usuário.',
])

/** SPEC 77. */
export const DEFAULT_MEMORY_RESTRICTIONS = Object.freeze([
  'Nunca armazenar senhas.',
  'Nunca armazenar tokens.',
  'Nunca armazenar credenciais.',
  'Respeitar pedidos de esquecimento.',
])

/**
 * Slider defaults mirror the config.json example in SPEC 39. They are read from
 * the slider catalogue rather than repeated here, so a new slider cannot ship
 * with no starting position.
 */
export const DEFAULT_SLIDERS = Object.freeze(defaultSliderValues())

/**
 * @param {string} text
 * @param {number} order
 * @returns {import('./types.js').AgentRule}
 */
export function createRule(text, order) {
  return { id: uuid(), text, order }
}

/**
 * The single place a knowledge document comes into existence: the store, the
 * importer and the template expander all go through here.
 *
 * Text is trimmed here rather than at each call site, so a document added from
 * the catalogue and one typed by hand are stored identically. Otherwise the
 * catalogue's trailing newline would survive in one path and not the other, and
 * an exported file would not import back byte for byte.
 *
 * @param {string} title
 * @param {string} content
 * @param {number} order
 * @param {string} [sourceId] The knowledge-library entry this started as.
 * @returns {import('./types.js').AgentKnowledge}
 */
export function createKnowledgeDoc(title, content, order, sourceId) {
  return {
    id: uuid(),
    title: title.trim(),
    content: content.trim(),
    order,
    ...(sourceId ? { sourceId } : {}),
  }
}

/**
 * The full tool catalogue, all disabled. Storing every tool (rather than only
 * the enabled ones) keeps per-tool purpose, rules and permission stable when the
 * user toggles a tool off and back on.
 * @returns {import('./types.js').AgentTool[]}
 */
export function createDefaultTools() {
  return createToolCatalogue()
}

/**
 * @returns {import('./types.js').AgentMemory}
 */
export function createDefaultMemory() {
  return {
    type: 'session',
    remember: [],
    restrictions: [...DEFAULT_MEMORY_RESTRICTIONS],
  }
}

/**
 * A blank agent with only the non-negotiable defaults applied.
 * @param {Partial<import('./types.js').Agent>} [overrides]
 * @returns {import('./types.js').Agent}
 */
export function createEmptyAgent(overrides = {}) {
  const now = new Date().toISOString()
  return {
    id: uuid(),
    name: '',
    description: '',
    objective: '',
    avatarId: DEFAULT_AVATAR_ID,
    soul: { mission: '', essence: '', philosophy: '', values: [] },
    personality: {
      tones: [],
      responseStyle: '',
      traits: [],
      ...DEFAULT_SLIDERS,
    },
    guardRails: DEFAULT_GUARD_RAILS.map((text, index) => createRule(text, index)),
    tools: createDefaultTools(),
    knowledge: [],
    memory: createDefaultMemory(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/**
 * Build a complete, fully editable agent from a template.
 *
 * Templates replace the single worked example SPEC 75 described: rather than one
 * generic agent appearing unbidden on a first visit, the user picks the role
 * they actually want and gets all nine steps filled in.
 *
 * The tool list keeps all ten entries with only the named ones enabled, so
 * per-tool purpose and rules survive the user toggling one off and on again.
 * Hard rules get fresh ids here, never shared with the template definition.
 *
 * Knowledge arrives as catalogue ids and is expanded into real documents, copied
 * so the user can edit them. An id the catalogue no longer has is dropped rather
 * than expanded into an empty document.
 *
 * @param {string} templateId
 * @returns {import('./types.js').Agent}
 */
export function createAgentFromTemplate(templateId) {
  const template = getTemplate(templateId)
  if (!template) throw new Error(`Unknown agent template: ${templateId}`)

  const base = createEmptyAgent()
  const source = template.agent
  const enabled = new Set(source.tools)

  return {
    ...base,
    name: source.name,
    description: source.description,
    objective: source.objective,
    soul: { ...base.soul, ...source.soul },
    personality: { ...base.personality, ...source.personality },
    guardRails: source.guardRails.map((text, index) => createRule(text, index)),
    tools: base.tools.map((tool) =>
      enabled.has(tool.id) ? { ...tool, enabled: true } : tool
    ),
    knowledge: (source.knowledge ?? [])
      .map((entryId) => getKnowledgeEntry(entryId))
      .filter((entry) => entry !== undefined)
      .slice(0, LIMITS.maxKnowledgeDocs)
      .map((entry, index) => createKnowledgeDoc(entry.title, entry.content, index, entry.id)),
    memory: {
      ...base.memory,
      type: source.memory.type,
      remember: [...source.memory.remember],
      // The SPEC 77 defaults are safety rules; a template may add to them but
      // never replace them.
      restrictions: [...base.memory.restrictions, ...(source.extraRestrictions ?? [])],
    },
  }
}

/**
 * Copy an agent under a new identity (SPEC 96).
 * @param {import('./types.js').Agent} agent
 * @returns {import('./types.js').Agent}
 */
export function duplicateAgent(agent) {
  const now = new Date().toISOString()
  return {
    ...structuredClone(agent),
    id: uuid(),
    name: `${agent.name} — Cópia`,
    guardRails: agent.guardRails.map((rule) => ({ ...rule, id: uuid() })),
    createdAt: now,
    updatedAt: now,
  }
}
