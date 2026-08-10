// @ts-check
/**
 * Markdown generation (ADR-010, ADR-014).
 *
 * Markdown is *derived*, never stored: the Agent object is the only source of
 * truth (ADR-013). Every function here is pure, which is what makes the live
 * preview in SPEC 63 cheap enough to re-run on each keystroke.
 *
 * Section headings stay in English, matching the worked examples in SPEC 35 and
 * SPEC 38; the content itself is whatever language the user wrote in.
 */

import { toneLabels } from '../data/tones.js'
import { traitLabels } from '../data/traits.js'
import { responseStyleLabel } from '../data/response-styles.js'
import { soulValueLabels } from '../data/soul-values.js'
import { getMemoryType, memoryOptionLabel } from '../data/memory.js'
import { BEHAVIOR_SLIDERS, sliderBand } from '../data/behavior-sliders.js'
import { getToolDefinition } from '../data/tools.js'

/**
 * Join non-empty blocks with a blank line between them.
 * @param {...(string | null | undefined | false)} blocks
 * @returns {string}
 */
export function joinBlocks(...blocks) {
  return blocks.filter((block) => typeof block === 'string' && block.length > 0).join('\n\n')
}

/**
 * @param {number} level
 * @param {string} text
 * @returns {string}
 */
export function heading(level, text) {
  return `${'#'.repeat(level)} ${text}`
}

/**
 * @param {ReadonlyArray<string>} items
 * @returns {string}
 */
export function bullets(items) {
  return items.map((item) => `- ${item}`).join('\n')
}

/**
 * @param {ReadonlyArray<string>} items
 * @returns {string}
 */
export function numbered(items) {
  return items.map((item, index) => `${index + 1}. ${item}`).join('\n')
}

/**
 * Rules in their user-defined order (SPEC 27).
 * @param {import('./types.js').Agent} agent
 * @returns {string[]}
 */
export function orderedRuleTexts(agent) {
  return [...agent.guardRails]
    .sort((a, b) => a.order - b.order)
    .map((rule) => rule.text.trim())
    .filter((text) => text.length > 0)
}

/**
 * @param {import('./types.js').Agent} agent
 * @returns {import('./types.js').AgentTool[]}
 */
export function enabledTools(agent) {
  return agent.tools.filter((tool) => tool.enabled)
}

/* ------------------------------------------------------------------ *
 * Section builders — shared by AGENT.md and by the per-topic files.   *
 * ------------------------------------------------------------------ */

/**
 * @param {import('./types.js').Agent} agent
 * @param {number} [level]
 * @returns {string}
 */
export function soulSection(agent, level = 2) {
  const { mission, essence, philosophy, values } = agent.soul
  const body = joinBlocks(
    mission.trim() && joinBlocks(heading(level + 1, 'Mission'), mission.trim()),
    essence.trim() && joinBlocks(heading(level + 1, 'Essence'), essence.trim()),
    philosophy?.trim() && joinBlocks(heading(level + 1, 'Philosophy'), philosophy.trim()),
    values.length > 0 && joinBlocks(heading(level + 1, 'Values'), bullets(soulValueLabels(values)))
  )
  if (!body) return ''
  return joinBlocks(heading(level, 'Soul'), body)
}

/**
 * @param {import('./types.js').Agent} agent
 * @param {number} [level]
 * @returns {string}
 */
export function personalitySection(agent, level = 2) {
  const { tones, traits, responseStyle } = agent.personality

  const behaviour = BEHAVIOR_SLIDERS.map((slider) => {
    const value = agent.personality[slider.id]
    return `${slider.label}: ${value}/100 — ${sliderBand(value, slider.lowLabel, slider.highLabel)}`
  })

  const body = joinBlocks(
    tones.length > 0 && joinBlocks(heading(level + 1, 'Tone'), bullets(toneLabels(tones))),
    traits.length > 0 && joinBlocks(heading(level + 1, 'Traits'), bullets(traitLabels(traits))),
    responseStyle &&
      joinBlocks(heading(level + 1, 'Response Style'), `${responseStyleLabel(responseStyle)}.`),
    joinBlocks(heading(level + 1, 'Behavior'), bullets(behaviour))
  )
  if (!body) return ''
  return joinBlocks(heading(level, 'Personality'), body)
}

/**
 * @param {import('./types.js').Agent} agent
 * @param {number} [level]
 * @returns {string}
 */
export function rulesSection(agent, level = 2) {
  const rules = orderedRuleTexts(agent)
  if (rules.length === 0) return ''
  return joinBlocks(heading(level, 'Guard Rails'), numbered(rules))
}

/**
 * @param {import('./types.js').Agent} agent
 * @param {number} [level]
 * @returns {string}
 */
export function toolsSection(agent, level = 2) {
  const tools = enabledTools(agent)
  if (tools.length === 0) return ''

  const lines = tools.map((tool) => {
    const purpose = tool.purpose?.trim() || getToolDefinition(tool.id)?.defaultPurpose || ''
    const head = purpose ? `**${tool.name}** — ${purpose}` : `**${tool.name}**`
    const nested = (tool.rules ?? [])
      .map((rule) => rule.trim())
      .filter(Boolean)
      .map((rule) => `  - ${rule}`)
    return [`- ${head}`, ...nested].join('\n')
  })

  return joinBlocks(heading(level, 'Tools'), lines.join('\n'))
}

/**
 * @param {import('./types.js').Agent} agent
 * @param {number} [level]
 * @returns {string}
 */
export function memorySection(agent, level = 2) {
  const type = getMemoryType(agent.memory.type)
  const remember = agent.memory.remember.map(memoryOptionLabel)
  const restrictions = agent.memory.restrictions
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)

  const body = joinBlocks(
    type && `Type: ${type.label} — ${type.description}`,
    agent.memory.type !== 'none' &&
      remember.length > 0 &&
      joinBlocks(heading(level + 1, 'Remember'), bullets(remember)),
    restrictions.length > 0 &&
      joinBlocks(heading(level + 1, 'Never Remember'), bullets(restrictions))
  )
  if (!body) return ''
  return joinBlocks(heading(level, 'Memory'), body)
}

/**
 * @param {import('./types.js').Agent} agent
 * @param {number} [level]
 * @returns {string}
 */
export function purposeSection(agent, level = 2) {
  const objective = agent.objective.trim()
  if (!objective) return ''
  return joinBlocks(heading(level, 'Purpose'), objective)
}

/* ------------------------------------------------------------------ *
 * Documents                                                          *
 * ------------------------------------------------------------------ */

/**
 * The complete agent document — what the preview shows and what AGENT.md
 * contains (SPEC 35, SPEC 38).
 * @param {import('./types.js').Agent} agent
 * @returns {string}
 */
export function generateAgentMarkdown(agent) {
  const name = agent.name.trim() || 'Agente sem nome'
  const description = agent.description?.trim()

  return `${joinBlocks(
    heading(1, name),
    description && `> ${description}`,
    purposeSection(agent),
    soulSection(agent),
    personalitySection(agent),
    rulesSection(agent),
    toolsSection(agent),
    memorySection(agent)
  )}\n`
}
