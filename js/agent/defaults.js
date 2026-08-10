// @ts-check
/**
 * Factory functions for new agents (SPEC 75, 76, 77).
 *
 * Everything here returns a fresh, fully-populated Agent so the rest of the app
 * never has to defend against half-built state.
 */

import { uuid } from '../lib/uuid.js'
import { TOOLS } from '../data/tools.js'
import { DEFAULT_AVATAR_ID } from '../data/avatars.js'
import { getTemplate } from '../data/templates.js'

/** SPEC 76. */
export const DEFAULT_HARD_RULES = Object.freeze([
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

/** Slider defaults mirror the config.json example in SPEC 39. */
export const DEFAULT_SLIDERS = Object.freeze({
  creativity: 50,
  precision: 70,
  formality: 40,
  proactivity: 60,
  detail: 60,
  autonomy: 50,
})

/**
 * @param {string} text
 * @param {number} order
 * @returns {import('./types.js').AgentRule}
 */
export function createRule(text, order) {
  return { id: uuid(), text, order }
}

/**
 * The full tool catalogue, all disabled. Storing every tool (rather than only
 * the enabled ones) keeps per-tool purpose and rules stable when the user
 * toggles a tool off and back on.
 * @returns {import('./types.js').AgentTool[]}
 */
export function createDefaultTools() {
  return TOOLS.map((tool) => ({ id: tool.id, name: tool.name, enabled: false }))
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
    hardRules: DEFAULT_HARD_RULES.map((text, index) => createRule(text, index)),
    tools: createDefaultTools(),
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
 * they actually want and gets all eight steps filled in.
 *
 * The tool list keeps all ten entries with only the named ones enabled, so
 * per-tool purpose and rules survive the user toggling one off and on again.
 * Hard rules get fresh ids here, never shared with the template definition.
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
    hardRules: source.hardRules.map((text, index) => createRule(text, index)),
    tools: base.tools.map((tool) =>
      enabled.has(tool.id) ? { ...tool, enabled: true } : tool
    ),
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
    hardRules: agent.hardRules.map((rule) => ({ ...rule, id: uuid() })),
    createdAt: now,
    updatedAt: now,
  }
}
