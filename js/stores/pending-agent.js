// @ts-check
/**
 * A one-shot handoff for an agent that no URL can describe.
 *
 * Templates travel as `/studio/new/<template>`, so reloading that address
 * rebuilds the same agent. An imported file has no such address: the bytes came
 * from the user's disk. This is the smallest seam that lets the importer hand a
 * ready agent to the builder without inventing a fake route, and without
 * writing it straight into the library, where an agent that arrived without a
 * name would then drift away from the draft autosave keeps writing.
 *
 * Deliberately not part of builder-store: the builder is created *after* the
 * route resolves, and this value has to survive that gap.
 */

/** @type {import('../agent/types.js').Agent | null} */
let pending = null

/**
 * @param {import('../agent/types.js').Agent} agent
 * @returns {void}
 */
export function setPendingAgent(agent) {
  pending = agent
}

/**
 * Read the pending agent and clear it, so a later visit to `/studio/new` starts
 * fresh instead of resurrecting an import the user has moved on from.
 * @returns {import('../agent/types.js').Agent | null}
 */
export function takePendingAgent() {
  const agent = pending
  pending = null
  return agent
}
