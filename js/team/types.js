// @ts-check
/**
 * The Team domain model.
 *
 * A team is a seating chart, not a container: it holds `agentId` references and
 * nothing else about the agents. ADR-013 makes the `Agent` object the single
 * source of truth, and a team that copied names, objectives or avatars would be
 * a second copy of that truth, going stale the first time someone renamed an
 * agent in the builder. Everything the office shows about a member is resolved
 * from the library at render time.
 *
 * The four modes are the four shapes the keynote already teaches (see
 * data/keynote-agentic.js): `orders` is parallelisation, `chain` is prompt
 * chaining, `review` is evaluator-optimizer and `managed` is
 * orchestrator-worker. Everything about them beyond this union lives in
 * data/team-modes.js.
 *
 * @typedef {'orders' | 'chain' | 'review' | 'managed'} TeamMode
 */

/**
 * One seat at the table.
 *
 * The field is `instruction` rather than `order` because `order` already means
 * *position* in AgentRule and AgentKnowledge, and a team where `order` meant a
 * sentence in one file and an index in another would be a bug waiting to be
 * written. The UI labels it "Ordem".
 *
 * @typedef {Object} TeamMember
 * @property {string} agentId      Reference into the library. Never a copy.
 * @property {string} instruction  What this agent was told to do.
 */

/**
 * @typedef {Object} Team
 * @property {string} id
 * @property {string} name
 * @property {string} objective
 * @property {TeamMode} mode
 * @property {string | null} leadId The seat a mode singles out: the manager
 *   under `managed`, the evaluator under `review`. An agentId that is also in
 *   `members`, or null when nobody has been promoted yet. Kept across a switch
 *   to a mode with no lead, so going and coming back does not cost the choice.
 *   Called `lead` rather than `manager` because an evaluator manages nobody.
 * @property {TeamMember[]} members Array order is desk order, and under `chain`
 *   it is the running order too. There is no `seat` field: the position in the
 *   array is the position in the room, and a second copy of it would be state
 *   waiting to diverge from the array it describes.
 * @property {string} createdAt ISO-8601.
 * @property {string} updatedAt ISO-8601.
 */

export {}
