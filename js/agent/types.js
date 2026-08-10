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
 * @property {AgentMemory} memory
 * @property {string} createdAt  ISO-8601.
 * @property {string} updatedAt  ISO-8601.
 */

/**
 * The builder's eight steps (SPEC 8, SPEC 56).
 * @typedef {'identity' | 'objective' | 'soul' | 'personality' | 'rules' | 'tools' | 'memory' | 'export'} StepId
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
