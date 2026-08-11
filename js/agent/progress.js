// @ts-check
/**
 * Step completion, used by the sidebar trail and the export summary.
 *
 * "Complete" here means the user has made a real choice — not that the step is
 * mandatory. Only name and objective actually gate anything (SPEC 50).
 */

import { canExport } from './validate.js'

/**
 * @param {import('./types.js').Agent} agent
 * @param {import('./types.js').StepId} step
 * @returns {boolean}
 */
export function isStepComplete(agent, step) {
  switch (step) {
    case 'identity':
      return agent.name.trim().length >= 2
    case 'objective':
      return agent.objective.trim().length > 0
    case 'soul':
      return agent.soul.mission.trim().length > 0 || agent.soul.essence.trim().length > 0
    case 'personality':
      return (
        agent.personality.tones.length > 0 ||
        agent.personality.traits.length > 0 ||
        agent.personality.responseStyle.length > 0
      )
    case 'rules':
      return agent.guardRails.some((rule) => rule.text.trim().length > 0)
    case 'tools':
      return agent.tools.some((tool) => tool.enabled)
    case 'knowledge':
      return agent.knowledge.length > 0
    case 'memory':
      return agent.memory.type !== 'none'
    case 'export':
      return canExport(agent)
    default:
      return false
  }
}
