// @ts-check
/**
 * Where an exported agent can be taken.
 *
 * Wordmarks, not logos, and that is deliberate: SPEC 14 and SPEC 74 forbid
 * bundling third-party brand assets, every one of these marks carries its own
 * usage terms, and the app ships nothing it cannot serve from this repository.
 * A name set in the product's own type, in grey, says "works with" without
 * borrowing anyone's identity.
 *
 * The glyph beside each name is from the bundled Lucide set and stands for what
 * the tool *is* (a terminal, an SDK, a chat), never for the brand.
 *
 * Nothing about the export is tool-specific, so this list is a statement about
 * where AGENT.md is known to be useful, not a compatibility matrix.
 */

/**
 * @typedef {Object} CompatibleTool
 * @property {string} name
 * @property {string} icon
 */

/** @type {ReadonlyArray<CompatibleTool>} */
export const COMPATIBLE_TOOLS = Object.freeze([
  { name: 'Google Antigravity', icon: 'rocket' },
  { name: 'Claude Code', icon: 'terminal' },
  { name: 'Gemini', icon: 'sparkles' },
  { name: 'OpenAI Agents SDK', icon: 'package' },
  { name: 'Google ADK', icon: 'cpu' },
  { name: 'CrewAI', icon: 'handshake' },
  { name: 'ChatGPT', icon: 'message-square' },
  { name: 'LangGraph', icon: 'list-tree' },
])
