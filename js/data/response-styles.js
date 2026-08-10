// @ts-check
/** Response style options (SPEC 24). Single choice, rendered as vertical cards. */

/**
 * @typedef {Object} ResponseStyleOption
 * @property {string} id
 * @property {string} label
 * @property {string} icon
 * @property {string} description
 */

/** @type {ReadonlyArray<ResponseStyleOption>} */
export const RESPONSE_STYLES = Object.freeze([
  { id: 'clear-direct', label: 'Claro e direto', icon: 'message-square', description: 'Respostas enxutas, sem enfeite.' },
  { id: 'detailed', label: 'Detalhado e estruturado', icon: 'list-tree', description: 'Cobre o assunto em profundidade e bem organizado.' },
  { id: 'summarized', label: 'Resumido e objetivo', icon: 'minimize-2', description: 'Só o essencial, em poucas linhas.' },
  { id: 'conversational', label: 'Conversacional', icon: 'messages-square', description: 'Fluido, como um diálogo real.' },
  { id: 'step-by-step', label: 'Passo a passo', icon: 'list-ordered', description: 'Instruções numeradas, fáceis de seguir.' },
  { id: 'socratic', label: 'Socrático', icon: 'circle-help', description: 'Conduz por perguntas até a resposta.' },
  { id: 'executive', label: 'Executivo', icon: 'presentation', description: 'Conclusão primeiro, detalhes depois.' },
  { id: 'technical', label: 'Técnico', icon: 'code', description: 'Vocabulário preciso e exemplos concretos.' },
])

/**
 * @param {string} id
 * @returns {ResponseStyleOption | undefined}
 */
export function getResponseStyle(id) {
  return RESPONSE_STYLES.find((style) => style.id === id)
}

/**
 * @param {string} id
 * @returns {string}
 */
export function responseStyleLabel(id) {
  return getResponseStyle(id)?.label ?? id
}
