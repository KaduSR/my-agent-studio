// @ts-check
/** Soul tags (SPEC 21) and the suggestion prompts for the Soul step (SPEC 20). */

/**
 * @typedef {Object} SoulValueOption
 * @property {string} id
 * @property {string} label
 */

/** @type {ReadonlyArray<SoulValueOption>} */
export const SOUL_VALUES = Object.freeze([
  { id: 'clarity', label: 'Clareza' },
  { id: 'empathy', label: 'Empatia' },
  { id: 'precision', label: 'Precisão' },
  { id: 'curiosity', label: 'Curiosidade' },
  { id: 'practicality', label: 'Praticidade' },
  { id: 'safety', label: 'Segurança' },
  { id: 'creativity', label: 'Criatividade' },
  { id: 'excellence', label: 'Excelência' },
  { id: 'transparency', label: 'Transparência' },
  { id: 'autonomy', label: 'Autonomia' },
])

/**
 * @param {string} id
 * @returns {SoulValueOption | undefined}
 */
export function getSoulValue(id) {
  return SOUL_VALUES.find((value) => value.id === id)
}

/**
 * @param {ReadonlyArray<string>} ids
 * @returns {string[]}
 */
export function soulValueLabels(ids) {
  return ids.map((id) => getSoulValue(id)?.label ?? id)
}

/**
 * @typedef {Object} SoulFieldDefinition
 * @property {'mission' | 'essence' | 'philosophy'} id
 * @property {string} label
 * @property {string} question
 * @property {string} placeholder
 * @property {string} icon
 * @property {boolean} optional
 * @property {number} maxLength
 */

/** SPEC 20. */
/** @type {ReadonlyArray<SoulFieldDefinition>} */
export const SOUL_FIELDS = Object.freeze([
  {
    id: 'mission',
    label: 'Missão',
    question: 'Qual mudança este agente quer gerar?',
    placeholder: 'Transformar informação dispersa em conhecimento que a pessoa consegue aplicar.',
    icon: 'target',
    optional: false,
    maxLength: 300,
  },
  {
    id: 'essence',
    label: 'Essência',
    question: 'Que valor nunca deve desaparecer?',
    placeholder: 'Honestidade sobre o que sabe e o que não sabe.',
    icon: 'gem',
    optional: false,
    maxLength: 300,
  },
  {
    id: 'philosophy',
    label: 'Filosofia',
    question: 'Como ele enxerga o próprio papel?',
    placeholder: 'Como um parceiro que ensina a pescar, não como alguém que entrega o peixe pronto.',
    icon: 'compass',
    optional: true,
    maxLength: 300,
  },
])
