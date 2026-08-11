// @ts-check
/**
 * Reconciling a stored tool list with the catalogue that ships today.
 *
 * Two callers, one rule. Both the library (stores/library-store.js) and the JSON
 * importer (agent/transfer.js) read tool lists written by an older version of
 * the app, and both need the same answer: keep everything the user configured,
 * add whatever the catalogue has gained since, and never let a stale record
 * decide what the catalogue contains.
 *
 * Before this existed, `reviveAgent` handed back the stored array untouched, so
 * an agent saved when there were ten tools would never see the eleventh — the
 * new tool simply did not exist for that agent, with no error anywhere.
 *
 * Custom tools are the exception that shapes the whole function: an id that is
 * not in the catalogue is normally a typo or a tool that was removed, and
 * dropping it is right. But a user-declared tool is also not in the catalogue,
 * and dropping *that* would delete something they wrote. The `custom` flag is
 * what tells the two apart.
 */

import { LIMITS } from './validate.js'
import { TOOLS, isToolPermission } from '../data/tools.js'

/** Custom tool ids are prefixed so they can never collide with the catalogue. */
export const CUSTOM_TOOL_PREFIX = 'custom-'

/**
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
function asRecord(value) {
  return typeof value === 'object' && value !== null ? /** @type {any} */ (value) : {}
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
 * @param {unknown} value
 * @returns {string[]}
 */
function ruleList(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((rule) => typeof rule === 'string')
    .map((rule) => rule.trim())
    .filter(Boolean)
}

/**
 * A blank catalogue: every tool, disabled, carrying its default permission.
 * @returns {import('./types.js').AgentTool[]}
 */
export function createToolCatalogue() {
  return TOOLS.map((tool) => ({
    id: tool.id,
    name: tool.name,
    enabled: false,
    permission: tool.defaultPermission,
  }))
}

/**
 * Merge a stored (or imported) tool list onto the current catalogue.
 *
 * Accepts every shape the app has ever written or read:
 *  - our own: every tool, each with `enabled`
 *  - a template's: `["web-search", "email"]`
 *  - config.json's: only the enabled ones, with no flag
 *
 * @param {unknown} stored
 * @returns {import('./types.js').AgentTool[]} Catalogue order, custom tools last.
 */
export function mergeToolCatalogue(stored) {
  const catalogue = createToolCatalogue()
  if (!Array.isArray(stored)) return catalogue

  const byId = new Map(catalogue.map((tool) => [tool.id, tool]))
  /** @type {import('./types.js').AgentTool[]} */
  const custom = []

  // A list of bare ids can only mean "these are on".
  const flagless = stored.every((entry) => typeof entry === 'string')

  for (const entry of stored) {
    const source = typeof entry === 'string' ? { id: entry } : asRecord(entry)
    const id = typeof source.id === 'string' ? source.id : ''
    if (!id) continue

    const known = byId.get(id)
    const enabled = flagless || source.enabled !== false
    const purpose = text(source.purpose, LIMITS.toolPurposeMax)
    const rules = ruleList(source.rules)
    const permission = isToolPermission(source.permission) ? source.permission : undefined

    if (known) {
      known.enabled = enabled
      if (permission) known.permission = permission
      if (purpose) known.purpose = purpose
      if (rules.length > 0) known.rules = rules
      continue
    }

    // Not in the catalogue. Only something the user declared survives.
    if (source.custom !== true) continue
    if (custom.some((tool) => tool.id === id)) continue

    const name = text(source.name, LIMITS.nameMax)
    if (!name) continue

    custom.push({
      id,
      name,
      enabled,
      custom: true,
      permission: permission ?? 'ask',
      description: text(source.description, LIMITS.descriptionMax),
      ...(purpose ? { purpose } : {}),
      ...(rules.length > 0 ? { rules } : {}),
    })
  }

  return [...catalogue, ...custom]
}
