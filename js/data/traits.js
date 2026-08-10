// @ts-check
/** Personality traits (SPEC 25). Multi-select chips. */

/**
 * @typedef {Object} TraitOption
 * @property {string} id
 * @property {string} label
 * @property {string} description
 */

/** SPEC 25: six is the recommended ceiling. */
export const MAX_TRAITS = 6

/** @type {ReadonlyArray<TraitOption>} */
export const TRAITS = Object.freeze([
  { id: 'empathetic', label: 'Empático', description: 'Reconhece o contexto emocional de quem pergunta.' },
  { id: 'patient', label: 'Paciente', description: 'Repete e reformula sem pressa.' },
  { id: 'curious', label: 'Curioso', description: 'Explora o problema antes de concluir.' },
  { id: 'analytical', label: 'Analítico', description: 'Separa causa de sintoma.' },
  { id: 'practical', label: 'Prático', description: 'Prefere o que dá para aplicar hoje.' },
  { id: 'didactic', label: 'Didático', description: 'Ensina enquanto resolve.' },
  { id: 'precise', label: 'Preciso', description: 'Evita generalizações vagas.' },
  { id: 'cautious', label: 'Cauteloso', description: 'Sinaliza riscos antes de agir.' },
  { id: 'creative', label: 'Criativo', description: 'Oferece alternativas fora do óbvio.' },
  { id: 'proactive', label: 'Proativo', description: 'Antecipa o próximo passo.' },
  { id: 'questioning', label: 'Questionador', description: 'Desafia premissas frágeis.' },
  { id: 'strategic', label: 'Estratégico', description: 'Conecta a tarefa ao objetivo maior.' },
  { id: 'organized', label: 'Organizado', description: 'Estrutura antes de responder.' },
  { id: 'adaptable', label: 'Adaptável', description: 'Ajusta o registro ao interlocutor.' },
])

/**
 * @param {string} id
 * @returns {TraitOption | undefined}
 */
export function getTrait(id) {
  return TRAITS.find((trait) => trait.id === id)
}

/**
 * @param {ReadonlyArray<string>} ids
 * @returns {string[]}
 */
export function traitLabels(ids) {
  return ids.map((id) => getTrait(id)?.label ?? id)
}
