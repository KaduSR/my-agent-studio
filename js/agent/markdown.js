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
import { getMemoryKind, getMemoryType, memoryOptionLabel } from '../data/memory.js'
import { BEHAVIOR_SLIDERS, bandFor } from '../data/behavior-sliders.js'
import { getToolDefinition, getToolPermission } from '../data/tools.js'

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

/**
 * Knowledge documents in their user-defined order.
 * @param {import('./types.js').Agent} agent
 * @returns {import('./types.js').AgentKnowledge[]}
 */
export function orderedKnowledge(agent) {
  return [...agent.knowledge]
    .sort((a, b) => a.order - b.order)
    .filter((doc) => doc.title.trim().length > 0 && doc.content.trim().length > 0)
}

/**
 * Push every heading in a document down by `by` levels.
 *
 * Knowledge documents are the only content in the agent that arrives as Markdown
 * rather than as plain text, so they bring their own headings. Pasted in as-is, a
 * document's `#` would outrank the section holding it and the exported file would
 * read as a flat pile. Fenced blocks are left alone: a `#` in there is a comment.
 *
 * @param {string} markdown
 * @param {number} by
 * @returns {string}
 */
export function shiftHeadings(markdown, by) {
  if (by <= 0) return markdown

  return mapHeadings(markdown, (hashes, spacing, text) => {
    // Markdown has no h7: past six, the heading simply stops going deeper.
    return `${'#'.repeat(Math.min(6, hashes.length + by))}${spacing}${text}`
  })
}

/**
 * Walk a document's headings, leaving fenced blocks alone.
 * @param {string} markdown
 * @param {(hashes: string, spacing: string, text: string) => string} visit
 * @returns {string}
 */
function mapHeadings(markdown, visit) {
  let inFence = false

  return markdown
    .split('\n')
    .map((line) => {
      if (/^\s{0,3}(```|~~~)/.test(line)) {
        inFence = !inFence
        return line
      }
      if (inFence) return line

      const match = /^(#{1,6})(\s+)(.*)$/.exec(line)
      return match ? visit(match[1], match[2], match[3]) : line
    })
    .join('\n')
}

/**
 * The shallowest heading a document uses, or null when it has none.
 * @param {string} markdown
 * @returns {number | null}
 */
function topHeadingLevel(markdown) {
  /** @type {number | null} */
  let top = null
  mapHeadings(markdown, (hashes, spacing, text) => {
    top = top === null ? hashes.length : Math.min(top, hashes.length)
    return `${hashes}${spacing}${text}`
  })
  return top
}

/**
 * Drop a document's own title line when the section already emits it.
 *
 * Only when the two match, so a document whose first heading says something else
 * keeps it.
 *
 * @param {string} content
 * @param {string} title
 * @returns {string}
 */
function withoutRedundantTitle(content, title) {
  const match = /^\s*#\s+(.*)(?:\r?\n|$)/.exec(content)
  if (!match) return content
  if (match[1].trim().toLowerCase() !== title.trim().toLowerCase()) return content
  return content.slice(match[0].length).replace(/^\s*\n/, '')
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
    return `${slider.label}: ${value}/100 — ${bandFor(slider, value)}`
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
    const definition = getToolDefinition(tool.id)
    const purpose = tool.purpose?.trim() || definition?.defaultPurpose || ''
    const head = purpose ? `**${tool.name}** — ${purpose}` : `**${tool.name}**`

    // Permission comes first among the nested lines: "has a terminal" and "may
    // run commands without asking" are different statements, and whoever runs
    // this agent needs the second one before the usage notes.
    const permission = getToolPermission(tool.permission ?? definition?.defaultPermission)
    const nested = [
      `  - Permissão: ${permission.markdownLabel}`,
      ...(tool.rules ?? [])
        .map((rule) => rule.trim())
        .filter(Boolean)
        .map((rule) => `  - ${rule}`),
    ]
    return [`- ${head}`, ...nested].join('\n')
  })

  return joinBlocks(heading(level, 'Tools'), lines.join('\n'))
}

/**
 * One knowledge document, as its own titled block.
 *
 * The single place that decides how a document renders, so the section below and
 * the standalone `references/*.md` files cannot drift apart.
 *
 * @param {import('./types.js').AgentKnowledge} doc
 * @param {number} [level] Heading level for the document's title.
 * @returns {string}
 */
export function knowledgeDocument(doc, level = 3) {
  const title = doc.title.trim()
  const body = withoutRedundantTitle(doc.content.trim(), title).trim()

  // The shift is measured from what the document actually uses, not assumed. A
  // document that opened with its own H1 has had it removed by now and starts at
  // H2, and shifting by a fixed amount would jump a heading level.
  const top = topHeadingLevel(body)
  const shift = top === null ? 0 : Math.max(0, level + 1 - top)

  return joinBlocks(heading(level, title), shiftHeadings(body, shift))
}

/**
 * Reference material the agent carries into every conversation.
 *
 * Each document keeps its own Markdown, re-levelled to sit under its title, so
 * whoever runs the agent can quote a specific section of a specific document
 * rather than the whole blob.
 *
 * @param {import('./types.js').Agent} agent
 * @param {number} [level]
 * @returns {string}
 */
export function knowledgeSection(agent, level = 2) {
  const docs = orderedKnowledge(agent)
  if (docs.length === 0) return ''

  return joinBlocks(
    heading(level, 'Knowledge'),
    ...docs.map((doc) => knowledgeDocument(doc, level + 1))
  )
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

  const kinds = agent.memory.kinds
    .map((id) => getMemoryKind(id))
    .filter((kind) => kind !== undefined)
    .map((kind) => `${kind.label}: ${kind.description}`)

  const body = joinBlocks(
    type && `Type: ${type.label} — ${type.description}`,
    kinds.length > 0 && joinBlocks(heading(level + 1, 'Kinds'), bullets(kinds)),
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
    knowledgeSection(agent),
    memorySection(agent)
  )}\n`
}
