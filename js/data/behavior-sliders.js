// @ts-check
/**
 * Behavioural sliders (SPEC 26).
 *
 * SPEC 61 is explicit that these must not read as model parameters: the user
 * sees "quanto espaço ele terá para ser criativo?", never "temperature".
 * Each end of the scale gets a human label, and aria-valuetext announces the
 * current band instead of a bare number (SPEC 65).
 */

/**
 * @typedef {Object} SliderDefinition
 * @property {'creativity' | 'precision' | 'formality' | 'proactivity' | 'detail' | 'autonomy'} id
 * @property {string} label
 * @property {string} icon
 * @property {string} question
 * @property {string} lowLabel
 * @property {string} highLabel
 * @property {string} [tooltip]
 */

/** @type {ReadonlyArray<SliderDefinition>} */
export const BEHAVIOR_SLIDERS = Object.freeze([
  {
    id: 'creativity',
    label: 'Criatividade',
    icon: 'sparkles',
    question: 'Quanto espaço ele terá para ser criativo?',
    lowLabel: 'Conservador',
    highLabel: 'Experimental',
  },
  {
    id: 'precision',
    label: 'Precisão',
    icon: 'crosshair',
    question: 'Quanto rigor ele deve exigir de si mesmo?',
    lowLabel: 'Aproximado',
    highLabel: 'Rigoroso',
  },
  {
    id: 'formality',
    label: 'Formalidade',
    icon: 'briefcase',
    question: 'Que registro ele deve usar?',
    lowLabel: 'Informal',
    highLabel: 'Formal',
  },
  {
    id: 'proactivity',
    label: 'Proatividade',
    icon: 'rocket',
    question: 'Ele deve antecipar o próximo passo?',
    lowLabel: 'Só responde',
    highLabel: 'Antecipa',
  },
  {
    id: 'detail',
    label: 'Detalhamento',
    icon: 'layers',
    question: 'Quanta profundidade cada resposta deve ter?',
    lowLabel: 'Enxuto',
    highLabel: 'Aprofundado',
  },
  {
    id: 'autonomy',
    label: 'Autonomia',
    icon: 'compass',
    question: 'Quanto ele pode decidir sozinho?',
    lowLabel: 'Sempre confirma',
    highLabel: 'Decide sozinho',
    tooltip:
      'Autonomia alta significa que o agente segue adiante sem perguntar. Combine com Hard Rules claras para evitar surpresas.',
  },
])

/**
 * Human band for a 0-100 value, used in aria-valuetext and in the exported
 * Markdown so the number is never presented bare.
 * @param {number} value
 * @param {string} lowLabel
 * @param {string} highLabel
 * @returns {string}
 */
export function sliderBand(value, lowLabel, highLabel) {
  if (value <= 20) return `Muito ${lowLabel.toLowerCase()}`
  if (value <= 40) return lowLabel
  if (value < 60) return 'Equilibrado'
  if (value < 80) return highLabel
  return `Muito ${highLabel.toLowerCase()}`
}
