// @ts-check
/**
 * The Agent domain model (SPEC 41).
 *
 * ADR-013: this object is the single source of truth. Markdown, config.json and
 * the exported file tree are all derived from it and are never stored back into
 * state. Nothing in the app may keep a second copy of this data.
 */

/**
 * @typedef {Object} AgentSoul
 * @property {string} mission     What change the agent wants to create.
 * @property {string} essence     The value that must never disappear.
 * @property {string} [philosophy] How it sees its own role.
 * @property {string[]} values    Soul tags (SPEC 21).
 */

/**
 * The sliders are defined once, in data/behavior-sliders.js, and every consumer
 * (defaults, validation, config.json, the importer) reads them back from there.
 *
 * @typedef {Object} AgentPersonality
 * @property {string[]} tones          Up to 3 tone ids (SPEC 23).
 * @property {string} responseStyle    A single response-style id (SPEC 24).
 * @property {string[]} traits         Up to 6 trait ids (SPEC 25).
 * @property {number} creativity       0-100 (SPEC 26).
 * @property {number} precision        0-100.
 * @property {number} formality        0-100.
 * @property {number} proactivity      0-100.
 * @property {number} detail           0-100.
 * @property {number} autonomy         0-100.
 * @property {number} humor            0-100.
 * @property {number} technicality     0-100.
 * @property {number} uncertainty      0-100.
 */

/**
 * @typedef {Object} AgentRule
 * @property {string} id
 * @property {string} text
 * @property {number} order
 */

/**
 * @typedef {Object} AgentTool
 * @property {string} id
 * @property {string} name
 * @property {boolean} enabled
 * @property {string} [purpose]
 * @property {string[]} [rules]
 * @property {import('../data/tools.js').ToolPermission} [permission] How much
 *   rope the tool gets. Absent means the catalogue default still applies.
 * @property {boolean} [custom] Declared by the user, not in the catalogue: an
 *   MCP server or an in-house integration.
 * @property {string} [description] Only custom tools carry their own; the rest
 *   read it from the catalogue.
 */

/**
 * A document the agent is expected to consult: a best practice, a style guide,
 * an internal policy.
 *
 * The markdown is copied into the agent rather than referenced by `sourceId`,
 * because the whole point is that a document added from the catalogue can then
 * be edited. `sourceId` is provenance only — it is what lets the step show where
 * an entry came from and refuse to add the same one twice.
 *
 * @typedef {Object} AgentKnowledge
 * @property {string} id
 * @property {string} title
 * @property {string} content   Markdown, written or edited by the user.
 * @property {number} order
 * @property {string} [sourceId] The knowledge-library entry it started as.
 */

/** @typedef {'none' | 'session' | 'persistent' | 'selective'} MemoryType */

/**
 * @typedef {Object} AgentMemory
 * @property {MemoryType} type
 * @property {string[]} remember
 * @property {string[]} restrictions
 */

/**
 * @typedef {Object} Agent
 * @property {string} id
 * @property {string} name
 * @property {string} [description]
 * @property {string} objective
 * @property {string} [avatarId]
 * @property {AgentSoul} soul
 * @property {AgentPersonality} personality
 * @property {AgentRule[]} guardRails
 * @property {AgentTool[]} tools
 * @property {AgentKnowledge[]} knowledge
 * @property {AgentMemory} memory
 * @property {string} createdAt  ISO-8601.
 * @property {string} updatedAt  ISO-8601.
 */

/**
 * The builder's nine steps (SPEC 8, SPEC 56).
 * @typedef {'identity' | 'objective' | 'soul' | 'personality' | 'rules' | 'tools' | 'knowledge' | 'memory' | 'export'} StepId
 */

/**
 * Future AI assistance surface (SPEC 88). Documented so the seam is visible;
 * ADR-015 requires the MVP to work with no provider at all, so nothing
 * implements this yet.
 *
 * @typedef {Object} AgentSuggestionProvider
 * @property {(input: string) => Promise<string>} improveObjective
 * @property {(agent: Agent) => Promise<AgentSoul>} suggestSoul
 * @property {(agent: Agent) => Promise<AgentRule[]>} suggestRules
 */

export {}
