// @ts-check
/**
 * Builder state (ADR-006 responsibilities, SPEC 48).
 *
 * Every mutation goes through `patchAgent`, which produces a new Agent and
 * stamps updatedAt. Nothing else in the app is allowed to mutate an agent in
 * place — that invariant is what lets subscribers rely on reference equality
 * to decide whether to re-render.
 */

import { createStore } from '../lib/store.js'
import { createEmptyAgent, createRule } from '../agent/defaults.js'
import { MAX_TONES } from '../data/tones.js'
import { MAX_TRAITS } from '../data/traits.js'
import { STEP_IDS } from '../data/steps.js'
import { trackEvent } from '../lib/analytics.js'

/** @typedef {'idle' | 'saving' | 'saved' | 'error'} SaveStatus */

/**
 * @typedef {Object} BuilderState
 * @property {import('../agent/types.js').Agent} agent
 * @property {import('../agent/types.js').StepId} step
 * @property {SaveStatus} saveStatus
 * @property {string | null} saveError
 * @property {{ rule: import('../agent/types.js').AgentRule, index: number } | null} lastRemovedRule
 */

/** @type {import('../lib/store.js').Store<BuilderState>} */
export const builderStore = createStore(
  /** @type {BuilderState} */ ({
    agent: createEmptyAgent(),
    step: 'identity',
    saveStatus: 'idle',
    saveError: null,
    lastRemovedRule: null,
  })
)

/**
 * @returns {import('../agent/types.js').Agent}
 */
export function getAgent() {
  return builderStore.getState().agent
}

/**
 * Apply a transformation to the current agent.
 * @param {(agent: import('../agent/types.js').Agent) => import('../agent/types.js').Agent} mutator
 * @returns {void}
 */
function patchAgent(mutator) {
  const current = builderStore.getState().agent
  const next = mutator(current)
  if (next === current) return
  builderStore.setState({ agent: { ...next, updatedAt: new Date().toISOString() } })
}

/**
 * Toggle a value in an array, honouring an optional ceiling.
 * @param {ReadonlyArray<string>} list
 * @param {string} value
 * @param {number} [max]
 * @returns {string[] | null} null when the change is rejected by the ceiling.
 */
function toggleWithLimit(list, value, max) {
  if (list.includes(value)) return list.filter((entry) => entry !== value)
  if (max !== undefined && list.length >= max) return null
  return [...list, value]
}

/* ---------------------------- navigation ---------------------------- */

/**
 * @param {import('../agent/types.js').StepId} step
 * @returns {void}
 */
export function setStep(step) {
  if (builderStore.getState().step === step) return
  builderStore.setState({ step })
  trackEvent('step_viewed', { step })
}

/** @param {number} delta @returns {void} */
function moveStep(delta) {
  const index = STEP_IDS.indexOf(builderStore.getState().step)
  const next = STEP_IDS[index + delta]
  if (next) setStep(next)
}

export const goToNextStep = () => moveStep(1)
export const goToPreviousStep = () => moveStep(-1)

/* ------------------------------ lifecycle ---------------------------- */

/**
 * @param {import('../agent/types.js').Agent} agent
 * @param {import('../agent/types.js').StepId} [step]
 * @returns {void}
 */
export function loadAgent(agent, step = 'identity') {
  builderStore.setState({
    agent,
    step,
    saveStatus: 'idle',
    saveError: null,
    lastRemovedRule: null,
  })
}

/** @returns {void} */
export function resetAgent() {
  loadAgent(createEmptyAgent())
}

/**
 * @param {SaveStatus} status
 * @param {string | null} [error]
 * @returns {void}
 */
export function setSaveStatus(status, error = null) {
  builderStore.setState({ saveStatus: status, saveError: error })
}

/* ------------------------------- identity ---------------------------- */

/**
 * @param {Partial<Pick<import('../agent/types.js').Agent, 'name' | 'description' | 'objective' | 'avatarId'>>} patch
 * @returns {void}
 */
export function updateAgentFields(patch) {
  patchAgent((agent) => {
    const changed = Object.entries(patch).some(
      ([key, value]) => agent[/** @type {keyof import('../agent/types.js').Agent} */ (key)] !== value
    )
    return changed ? { ...agent, ...patch } : agent
  })
}

/* --------------------------------- soul ------------------------------ */

/**
 * @param {Partial<import('../agent/types.js').AgentSoul>} patch
 * @returns {void}
 */
export function updateSoul(patch) {
  patchAgent((agent) => {
    const changed = Object.entries(patch).some(
      ([key, value]) => agent.soul[/** @type {keyof import('../agent/types.js').AgentSoul} */ (key)] !== value
    )
    return changed ? { ...agent, soul: { ...agent.soul, ...patch } } : agent
  })
}

/**
 * @param {string} valueId
 * @returns {void}
 */
export function toggleSoulValue(valueId) {
  patchAgent((agent) => {
    const values = toggleWithLimit(agent.soul.values, valueId)
    return values ? { ...agent, soul: { ...agent.soul, values } } : agent
  })
}

/* ----------------------------- personality --------------------------- */

/**
 * @param {Partial<import('../agent/types.js').AgentPersonality>} patch
 * @returns {void}
 */
export function updatePersonality(patch) {
  patchAgent((agent) => ({ ...agent, personality: { ...agent.personality, ...patch } }))
}

/**
 * @param {string} toneId
 * @returns {boolean} false when the SPEC 23 ceiling blocked the change.
 */
export function toggleTone(toneId) {
  const tones = toggleWithLimit(getAgent().personality.tones, toneId, MAX_TONES)
  if (!tones) return false
  updatePersonality({ tones })
  if (tones.includes(toneId)) trackEvent('tone_selected', { toneId })
  return true
}

/**
 * @param {string} traitId
 * @returns {boolean} false when the SPEC 25 ceiling blocked the change.
 */
export function toggleTrait(traitId) {
  const traits = toggleWithLimit(getAgent().personality.traits, traitId, MAX_TRAITS)
  if (!traits) return false
  updatePersonality({ traits })
  return true
}

/**
 * @param {string} styleId
 * @returns {void}
 */
export function setResponseStyle(styleId) {
  updatePersonality({ responseStyle: styleId })
}

/**
 * @param {'creativity' | 'precision' | 'formality' | 'proactivity' | 'detail' | 'autonomy'} slider
 * @param {number} value
 * @returns {void}
 */
export function setSlider(slider, value) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)))
  if (getAgent().personality[slider] === clamped) return
  updatePersonality({ [slider]: clamped })
}

/* ------------------------------ hard rules --------------------------- */

/**
 * @param {import('../agent/types.js').AgentRule[]} rules
 * @returns {import('../agent/types.js').AgentRule[]}
 */
function renumber(rules) {
  return rules.map((rule, index) => (rule.order === index ? rule : { ...rule, order: index }))
}

/**
 * @param {string} text
 * @returns {void}
 */
export function addRule(text) {
  const trimmed = text.trim()
  if (!trimmed) return
  patchAgent((agent) => ({
    ...agent,
    guardRails: renumber([...agent.guardRails, createRule(trimmed, agent.guardRails.length)]),
  }))
}

/**
 * @param {string} id
 * @param {string} text
 * @returns {void}
 */
export function updateRuleText(id, text) {
  patchAgent((agent) => ({
    ...agent,
    guardRails: agent.guardRails.map((rule) => (rule.id === id ? { ...rule, text } : rule)),
  }))
}

/**
 * Remove a rule, remembering it so SPEC 58's undo can put it back.
 * @param {string} id
 * @returns {void}
 */
export function removeRule(id) {
  const agent = getAgent()
  const index = agent.guardRails.findIndex((rule) => rule.id === id)
  if (index === -1) return

  const rule = agent.guardRails[index]
  builderStore.setState({ lastRemovedRule: { rule, index } })
  patchAgent((current) => ({
    ...current,
    guardRails: renumber(current.guardRails.filter((candidate) => candidate.id !== id)),
  }))
}

/** @returns {boolean} */
export function undoRemoveRule() {
  const removed = builderStore.getState().lastRemovedRule
  if (!removed) return false

  patchAgent((agent) => {
    const rules = [...agent.guardRails]
    rules.splice(Math.min(removed.index, rules.length), 0, removed.rule)
    return { ...agent, guardRails: renumber(rules) }
  })
  builderStore.setState({ lastRemovedRule: null })
  return true
}

/**
 * @param {number} from
 * @param {number} to
 * @returns {void}
 */
export function moveRule(from, to) {
  patchAgent((agent) => {
    const rules = [...agent.guardRails].sort((a, b) => a.order - b.order)
    if (from < 0 || from >= rules.length || to < 0 || to >= rules.length || from === to) return agent
    const [moved] = rules.splice(from, 1)
    rules.splice(to, 0, moved)
    return { ...agent, guardRails: renumber(rules) }
  })
}

/* -------------------------------- tools ------------------------------ */

/**
 * @param {string} id
 * @returns {void}
 */
export function toggleTool(id) {
  patchAgent((agent) => ({
    ...agent,
    tools: agent.tools.map((tool) => {
      if (tool.id !== id) return tool
      if (!tool.enabled) trackEvent('tool_enabled', { toolId: id })
      return { ...tool, enabled: !tool.enabled }
    }),
  }))
}

/**
 * @param {string} id
 * @param {Partial<import('../agent/types.js').AgentTool>} patch
 * @returns {void}
 */
export function updateTool(id, patch) {
  patchAgent((agent) => ({
    ...agent,
    tools: agent.tools.map((tool) => (tool.id === id ? { ...tool, ...patch } : tool)),
  }))
}

/* -------------------------------- memory ----------------------------- */

/**
 * @param {import('../agent/types.js').MemoryType} type
 * @returns {void}
 */
export function setMemoryType(type) {
  patchAgent((agent) =>
    agent.memory.type === type ? agent : { ...agent, memory: { ...agent.memory, type } }
  )
}

/**
 * @param {string} optionId
 * @returns {void}
 */
export function toggleRemember(optionId) {
  patchAgent((agent) => {
    const remember = toggleWithLimit(agent.memory.remember, optionId)
    return remember ? { ...agent, memory: { ...agent.memory, remember } } : agent
  })
}

/**
 * @param {string} text
 * @returns {void}
 */
export function addRestriction(text) {
  const trimmed = text.trim()
  if (!trimmed) return
  patchAgent((agent) =>
    agent.memory.restrictions.includes(trimmed)
      ? agent
      : { ...agent, memory: { ...agent.memory, restrictions: [...agent.memory.restrictions, trimmed] } }
  )
}

/**
 * @param {number} index
 * @returns {void}
 */
export function removeRestriction(index) {
  patchAgent((agent) => ({
    ...agent,
    memory: {
      ...agent.memory,
      restrictions: agent.memory.restrictions.filter((_, i) => i !== index),
    },
  }))
}
