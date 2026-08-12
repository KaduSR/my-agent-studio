// @ts-check
/**
 * Validation (ADR-008, implemented without a schema library).
 *
 * Two distinct jobs:
 *  - `validateAgent` reports every field problem, for inline feedback.
 *  - `getExportBlockers` answers the narrower SPEC 50 question: may this agent
 *    be exported at all? Only name and objective gate that.
 */

import { MAX_TONES } from '../data/tones.js'
import { MAX_TRAITS } from '../data/traits.js'
import { SLIDER_IDS } from '../data/behavior-sliders.js'

export const LIMITS = Object.freeze({
  nameMin: 2,
  nameMax: 100,
  descriptionMax: 160,
  objectiveMax: 500,
  soulFieldMax: 300,
  ruleMax: 240,
  toolPurposeMax: 200,
  restrictionMax: 160,
  // Knowledge documents are the only long text the agent carries, and every
  // agent lives in localStorage. These ceilings are what keeps a knowledge base
  // from filling the quota; writeJSON already reports it, but a quota error is a
  // worse experience than a character counter.
  knowledgeTitleMax: 80,
  knowledgeContentMax: 4000,
  maxKnowledgeDocs: 12,
  maxTones: MAX_TONES,
  maxTraits: MAX_TRAITS,
  maxRules: 40,
  // Team fields live here with every other field length, so the team screen gets
  // textField's counter and aria-invalid for free instead of a second copy of
  // that plumbing. The team's structural ceiling is in team/defaults.js.
  teamNameMin: 2,
  teamNameMax: 80,
  teamObjectiveMax: 500,
  teamInstructionMax: 240,
})

/**
 * @typedef {Record<string, string>} ValidationErrors
 * @typedef {{ ok: boolean, errors: ValidationErrors }} ValidationResult
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
function asText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Validate a single field in isolation — used by inputs as the user types.
 * @param {'name' | 'description' | 'objective' | 'rule' | 'soulField' | 'toolPurpose'
 *   | 'knowledgeTitle' | 'knowledgeContent' | 'teamName' | 'teamObjective'
 *   | 'teamInstruction'} field
 * @param {string} value
 * @returns {string | null} An error message, or null when valid.
 */
export function validateField(field, value) {
  const text = asText(value)

  switch (field) {
    case 'name':
      if (text.length === 0) return 'Dê um nome ao seu agente.'
      if (text.length < LIMITS.nameMin) return `Use pelo menos ${LIMITS.nameMin} caracteres.`
      if (text.length > LIMITS.nameMax) return `Use no máximo ${LIMITS.nameMax} caracteres.`
      return null

    case 'description':
      if (text.length > LIMITS.descriptionMax)
        return `Use no máximo ${LIMITS.descriptionMax} caracteres.`
      return null

    case 'objective':
      if (text.length > LIMITS.objectiveMax)
        return `Use no máximo ${LIMITS.objectiveMax} caracteres.`
      return null

    case 'rule':
      if (text.length === 0) return 'Escreva a regra.'
      if (text.length > LIMITS.ruleMax) return `Use no máximo ${LIMITS.ruleMax} caracteres.`
      return null

    case 'soulField':
      if (text.length > LIMITS.soulFieldMax)
        return `Use no máximo ${LIMITS.soulFieldMax} caracteres.`
      return null

    case 'toolPurpose':
      if (text.length > LIMITS.toolPurposeMax)
        return `Use no máximo ${LIMITS.toolPurposeMax} caracteres.`
      return null

    case 'knowledgeTitle':
      if (text.length === 0) return 'Dê um título ao documento.'
      if (text.length > LIMITS.knowledgeTitleMax)
        return `Use no máximo ${LIMITS.knowledgeTitleMax} caracteres.`
      return null

    case 'knowledgeContent':
      if (text.length === 0) return 'Escreva o conteúdo do documento.'
      if (text.length > LIMITS.knowledgeContentMax)
        return `Use no máximo ${LIMITS.knowledgeContentMax} caracteres.`
      return null

    case 'teamName':
      if (text.length === 0) return 'Dê um nome ao time.'
      if (text.length < LIMITS.teamNameMin) return `Use pelo menos ${LIMITS.teamNameMin} caracteres.`
      if (text.length > LIMITS.teamNameMax) return `Use no máximo ${LIMITS.teamNameMax} caracteres.`
      return null

    case 'teamObjective':
      if (text.length > LIMITS.teamObjectiveMax)
        return `Use no máximo ${LIMITS.teamObjectiveMax} caracteres.`
      return null

    case 'teamInstruction':
      if (text.length > LIMITS.teamInstructionMax)
        return `Use no máximo ${LIMITS.teamInstructionMax} caracteres.`
      return null

    default:
      return null
  }
}

/**
 * Full-agent validation.
 * @param {import('./types.js').Agent} agent
 * @returns {ValidationResult}
 */
export function validateAgent(agent) {
  /** @type {ValidationErrors} */
  const errors = {}

  const name = validateField('name', agent.name)
  if (name) errors.name = name

  const description = validateField('description', agent.description ?? '')
  if (description) errors.description = description

  const objective = validateField('objective', agent.objective)
  if (objective) errors.objective = objective
  if (asText(agent.objective).length === 0) {
    errors.objective = 'Explique o que este agente existe para fazer.'
  }

  for (const key of /** @type {const} */ (['mission', 'essence', 'philosophy'])) {
    const message = validateField('soulField', agent.soul[key] ?? '')
    if (message) errors[`soul.${key}`] = message
  }

  if (agent.personality.tones.length > LIMITS.maxTones) {
    errors['personality.tones'] = `Escolha no máximo ${LIMITS.maxTones} tons.`
  }
  if (agent.personality.traits.length > LIMITS.maxTraits) {
    errors['personality.traits'] = `Escolha no máximo ${LIMITS.maxTraits} traços.`
  }

  for (const slider of SLIDER_IDS) {
    const value = agent.personality[slider]
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      errors[`personality.${slider}`] = 'Use um valor entre 0 e 100.'
    }
  }

  if (agent.guardRails.length > LIMITS.maxRules) {
    errors.guardRails = `Use no máximo ${LIMITS.maxRules} regras.`
  }
  for (const rule of agent.guardRails) {
    const message = validateField('rule', rule.text)
    if (message) {
      errors.guardRails = message
      break
    }
  }

  if (agent.knowledge.length > LIMITS.maxKnowledgeDocs) {
    errors.knowledge = `Use no máximo ${LIMITS.maxKnowledgeDocs} documentos.`
  }
  for (const doc of agent.knowledge) {
    const message =
      validateField('knowledgeTitle', doc.title) ?? validateField('knowledgeContent', doc.content)
    if (message) {
      errors.knowledge = message
      break
    }
  }

  return { ok: Object.keys(errors).length === 0, errors }
}

/**
 * @typedef {Object} ExportBlocker
 * @property {import('./types.js').StepId} step
 * @property {string} message
 */

/**
 * SPEC 50: export requires a non-empty name and objective, nothing more.
 * @param {import('./types.js').Agent} agent
 * @returns {ExportBlocker[]}
 */
export function getExportBlockers(agent) {
  /** @type {ExportBlocker[]} */
  const blockers = []

  if (asText(agent.name).length < LIMITS.nameMin) {
    blockers.push({ step: 'identity', message: 'Seu agente ainda não tem nome.' })
  }
  if (asText(agent.objective).length === 0) {
    blockers.push({ step: 'objective', message: 'Seu agente ainda não tem um objetivo.' })
  }

  return blockers
}

/**
 * @param {import('./types.js').Agent} agent
 * @returns {boolean}
 */
export function canExport(agent) {
  return getExportBlockers(agent).length === 0
}
