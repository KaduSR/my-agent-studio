// @ts-check
/** Step dispatch (SPEC 56). */

import { identityStep } from './identity.js'
import { objectiveStep } from './objective.js'
import { soulStep } from './soul.js'
import { personalityStep } from './personality.js'
import { rulesStep } from './rules.js'
import { toolsStep } from './tools.js'
import { knowledgeStep } from './knowledge.js'
import { memoryStep } from './memory.js'
import { exportStep } from './export.js'

/**
 * @param {import('../agent/types.js').StepId} step
 * @returns {import('./step-shell.js').StepView}
 */
export function renderStep(step) {
  switch (step) {
    case 'identity':
      return identityStep()
    case 'objective':
      return objectiveStep()
    case 'soul':
      return soulStep()
    case 'personality':
      return personalityStep()
    case 'rules':
      return rulesStep()
    case 'tools':
      return toolsStep()
    case 'knowledge':
      return knowledgeStep()
    case 'memory':
      return memoryStep()
    case 'export':
      return exportStep()
    default: {
      /** @type {never} */
      const exhaustive = step
      throw new Error(`Unhandled step: ${String(exhaustive)}`)
    }
  }
}
