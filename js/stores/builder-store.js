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
import { createEmptyAgent, createKnowledgeDoc, createRule, DEFAULT_SLIDERS } from '../agent/defaults.js'
import { getBehaviorPreset } from '../data/behavior-sliders.js'
import { getSoulPreset } from '../data/soul-presets.js'
import { getKnowledgeEntry } from '../data/knowledge-library.js'
import { CUSTOM_TOOL_PREFIX } from '../agent/tool-catalogue.js'
import { LIMITS } from '../agent/validate.js'
import { ALWAYS_MEMORY_KINDS } from '../data/memory.js'
import { MAX_TONES } from '../data/tones.js'
import { MAX_TRAITS } from '../data/traits.js'
import { STEP_IDS } from '../data/steps.js'
import { trackEvent } from '../lib/analytics.js'
import { slugify } from '../lib/uuid.js'

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

/**
 * Fill the whole Soul from an archetype.
 *
 * One store write rather than four, for the same reason applyBehaviorPreset
 * does it: the preset lands as a single revision instead of a burst. The values
 * array is copied because the catalogue entry is frozen and this one is about to
 * be toggled.
 *
 * @param {string} presetId
 * @returns {boolean} false when the id is unknown.
 */
export function applySoulPreset(presetId) {
  const preset = getSoulPreset(presetId)
  if (!preset) return false
  updateSoul({ ...preset.soul, values: [...preset.soul.values] })
  return true
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
 * @param {import('../data/behavior-sliders.js').SliderId} slider
 * @param {number} value
 * @returns {void}
 */
export function setSlider(slider, value) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)))
  if (getAgent().personality[slider] === clamped) return
  updatePersonality({ [slider]: clamped })
}

/**
 * Move every slider at once.
 *
 * One store write rather than nine, so a preset lands as a single undoable
 * change and autosave sees one revision instead of a burst.
 *
 * @param {string} presetId
 * @returns {boolean} false when the id is unknown.
 */
export function applyBehaviorPreset(presetId) {
  const preset = getBehaviorPreset(presetId)
  if (!preset) return false
  updatePersonality({ ...preset.values })
  return true
}

/** Put the nine sliders back where a new agent starts. @returns {void} */
export function resetBehaviorSliders() {
  updatePersonality({ ...DEFAULT_SLIDERS })
}

/* ------------------------------ hard rules --------------------------- */

/**
 * Make `order` contiguous again after an insert, a removal or a move. Shared with
 * knowledge documents, which are ordered the same way.
 *
 * @template {{ order: number }} T
 * @param {T[]} items
 * @returns {T[]}
 */
function renumber(items) {
  return items.map((item, index) => (item.order === index ? item : { ...item, order: index }))
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

/**
 * @param {string} id
 * @param {import('../data/tools.js').ToolPermission} permission
 * @returns {void}
 */
export function setToolPermission(id, permission) {
  patchAgent((agent) => ({
    ...agent,
    tools: agent.tools.map((tool) =>
      tool.id === id && tool.permission !== permission ? { ...tool, permission } : tool
    ),
  }))
}

/**
 * Declare a tool the catalogue does not have: an MCP server, an in-house
 * service. It arrives enabled, since nobody types a name for something they do
 * not want, and at `ask`, since nothing is known about what it can do.
 *
 * @param {{ name: string, description?: string }} input
 * @returns {string | null} The new tool's id, or null when the name was empty.
 */
export function addCustomTool({ name, description = '' }) {
  const label = name.trim().slice(0, LIMITS.nameMax)
  if (!label) return null

  const existing = new Set(getAgent().tools.map((tool) => tool.id))
  const base = `${CUSTOM_TOOL_PREFIX}${slugify(label, 'ferramenta')}`
  let id = base
  // A second "Slack" must not silently become the first one.
  for (let suffix = 2; existing.has(id); suffix += 1) id = `${base}-${suffix}`

  patchAgent((agent) => ({
    ...agent,
    tools: [
      ...agent.tools,
      {
        id,
        name: label,
        enabled: true,
        custom: true,
        permission: 'ask',
        description: description.trim().slice(0, LIMITS.descriptionMax),
      },
    ],
  }))

  trackEvent('tool_enabled', { toolId: id, custom: true })
  return id
}

/**
 * Only custom tools can be removed; catalogue tools are toggled off instead.
 * @param {string} id
 * @returns {void}
 */
export function removeCustomTool(id) {
  patchAgent((agent) => {
    const target = agent.tools.find((tool) => tool.id === id)
    if (!target?.custom) return agent
    return { ...agent, tools: agent.tools.filter((tool) => tool.id !== id) }
  })
}

/* ------------------------------ knowledge ---------------------------- */

/**
 * @typedef {Object} KnowledgeInput
 * @property {string} title
 * @property {string} content
 */

/**
 * Add a document the user wrote.
 *
 * Returns null rather than throwing so the step can decide what to say: an empty
 * title and a full shelf are different messages.
 *
 * @param {KnowledgeInput} input
 * @returns {string | null} The new id, or null when nothing was added.
 */
export function addKnowledgeDoc(input) {
  const title = input.title.trim().slice(0, LIMITS.knowledgeTitleMax)
  const content = input.content.trim().slice(0, LIMITS.knowledgeContentMax)
  if (!title || !content) return null
  if (getAgent().knowledge.length >= LIMITS.maxKnowledgeDocs) return null

  const doc = createKnowledgeDoc(title, content, getAgent().knowledge.length)
  patchAgent((agent) => ({ ...agent, knowledge: renumber([...agent.knowledge, doc]) }))
  return doc.id
}

/**
 * Copy a catalogue entry into the agent.
 *
 * A copy, not a reference: the whole point of the catalogue is that the document
 * is editable afterwards. `sourceId` records where it came from, which is also
 * what makes adding the same entry twice detectable.
 *
 * @param {string} entryId
 * @returns {string | null} null when the id is unknown or already added.
 */
export function addKnowledgeFromLibrary(entryId) {
  const entry = getKnowledgeEntry(entryId)
  if (!entry) return null

  const current = getAgent().knowledge
  if (current.some((doc) => doc.sourceId === entryId)) return null
  if (current.length >= LIMITS.maxKnowledgeDocs) return null

  const doc = createKnowledgeDoc(entry.title, entry.content, current.length, entry.id)
  patchAgent((agent) => ({ ...agent, knowledge: renumber([...agent.knowledge, doc]) }))
  return doc.id
}

/**
 * Edit a document in place.
 *
 * An edited document keeps its `sourceId`: it still came from the catalogue, and
 * forgetting that would let the same entry be added again alongside it.
 *
 * @param {string} id
 * @param {Partial<KnowledgeInput>} patch
 * @returns {void}
 */
export function updateKnowledgeDoc(id, patch) {
  patchAgent((agent) => ({
    ...agent,
    knowledge: agent.knowledge.map((doc) => {
      if (doc.id !== id) return doc
      const title = patch.title === undefined ? doc.title : patch.title.slice(0, LIMITS.knowledgeTitleMax)
      const content =
        patch.content === undefined ? doc.content : patch.content.slice(0, LIMITS.knowledgeContentMax)
      if (title === doc.title && content === doc.content) return doc
      return { ...doc, title, content }
    }),
  }))
}

/**
 * @param {string} id
 * @returns {void}
 */
export function removeKnowledgeDoc(id) {
  patchAgent((agent) => {
    const remaining = agent.knowledge.filter((doc) => doc.id !== id)
    if (remaining.length === agent.knowledge.length) return agent
    return { ...agent, knowledge: renumber(remaining) }
  })
}

/**
 * @param {number} from
 * @param {number} to
 * @returns {void}
 */
export function moveKnowledgeDoc(from, to) {
  patchAgent((agent) => {
    const docs = [...agent.knowledge].sort((a, b) => a.order - b.order)
    if (from < 0 || from >= docs.length || to < 0 || to >= docs.length || from === to) return agent
    const [moved] = docs.splice(from, 1)
    docs.splice(to, 0, moved)
    return { ...agent, knowledge: renumber(docs) }
  })
}

/* -------------------------------- memory ----------------------------- */

/**
 * Add or remove a kind of memory. The context window refuses to be removed: it
 * is a fact about how the model works, not a setting.
 * @param {string} id
 * @returns {void}
 */
export function toggleMemoryKind(id) {
  patchAgent((agent) => {
    // The window is not optional, so the card explains itself instead of toggling.
    if (ALWAYS_MEMORY_KINDS.includes(id)) return agent

    const has = agent.memory.kinds.includes(id)
    const kinds = has
      ? agent.memory.kinds.filter((kind) => kind !== id)
      : [...agent.memory.kinds, id]

    return { ...agent, memory: { ...agent.memory, kinds } }
  })
}

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
