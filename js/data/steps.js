// @ts-check
/** The eight builder steps (SPEC 8, 13, 56). */

/**
 * @typedef {Object} StepDefinition
 * @property {import('../agent/types.js').StepId} id
 * @property {number} index
 * @property {string} label      Sidebar label.
 * @property {string} hint       Sidebar sub-label.
 * @property {string} icon
 * @property {string} title      Page title for the step.
 * @property {string} subtitle   Plain-language framing (SPEC 61).
 * @property {string} [tooltip]  Explanation for less obvious concepts (SPEC 60).
 */

/** @type {ReadonlyArray<StepDefinition>} */
export const STEPS = Object.freeze([
  {
    id: 'identity',
    index: 1,
    label: 'Nome',
    hint: 'Dê vida ao seu agente',
    icon: 'user-round',
    title: 'Como seu agente se chama?',
    subtitle: 'Escolha um rosto e um nome que deixem claro para quem ele existe.',
  },
  {
    id: 'objective',
    index: 2,
    label: 'Objetivo',
    hint: 'Qual o propósito principal?',
    icon: 'target',
    title: 'O que este agente existe para fazer?',
    subtitle: 'Descreva o resultado que ele deve entregar, em uma frase clara.',
  },
  {
    id: 'soul',
    index: 3,
    label: 'Soul',
    hint: 'Essência e missão',
    icon: 'heart',
    title: 'A alma do seu agente',
    subtitle: 'Os princípios que devem orientar todas as decisões dele.',
    tooltip:
      'A Soul é o que seu agente leva para toda conversa: a mudança que quer gerar, o valor de que nunca abre mão e como enxerga o próprio papel.',
  },
  {
    id: 'personality',
    index: 4,
    label: 'Personalidade',
    hint: 'Tom, estilo e traços',
    icon: 'palette',
    title: 'Como ele se comunica?',
    subtitle: 'Defina como seu agente deve pensar e responder.',
  },
  {
    id: 'rules',
    index: 5,
    label: 'Hard Rules',
    hint: 'Limites inegociáveis',
    icon: 'shield-check',
    title: 'O que ele nunca deve fazer',
    subtitle: 'Regras que valem sempre, mesmo quando pedirem o contrário.',
    tooltip:
      'Hard Rules são limites inegociáveis. Diferente de preferências, elas não podem ser flexibilizadas durante a conversa.',
  },
  {
    id: 'tools',
    index: 6,
    label: 'Ferramentas',
    hint: 'O que ele pode usar',
    icon: 'wrench',
    title: 'Do que ele precisa para trabalhar?',
    subtitle: 'Declare as ferramentas que seu agente espera ter à disposição.',
  },
  {
    id: 'memory',
    index: 7,
    label: 'Memória',
    hint: 'O que ele deve lembrar',
    icon: 'brain',
    title: 'O que ele deve lembrar de você?',
    subtitle: 'Escolha quanto contexto seu agente carrega de uma conversa para outra.',
  },
  {
    id: 'export',
    index: 8,
    label: 'Exportar',
    hint: 'Leve para onde quiser',
    icon: 'package',
    title: 'Seu agente está pronto',
    subtitle: 'Copie, baixe ou leve a estrutura completa para a sua ferramenta.',
  },
])

/** @type {ReadonlyArray<import('../agent/types.js').StepId>} */
export const STEP_IDS = Object.freeze(STEPS.map((step) => step.id))

/**
 * @param {import('../agent/types.js').StepId} id
 * @returns {StepDefinition}
 */
export function getStep(id) {
  const step = STEPS.find((candidate) => candidate.id === id)
  if (!step) throw new Error(`Unknown step: ${id}`)
  return step
}

/**
 * @param {string} value
 * @returns {value is import('../agent/types.js').StepId}
 */
export function isStepId(value) {
  return STEP_IDS.includes(/** @type {import('../agent/types.js').StepId} */ (value))
}
