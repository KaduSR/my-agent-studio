// @ts-check
/**
 * Smart suggestions for the objective step (SPEC 19).
 *
 * Picking one fills the textarea with a concrete example the user can edit,
 * which is the point: it teaches the shape of a good objective instead of
 * leaving a blank field.
 */

/**
 * @typedef {Object} ObjectiveSuggestion
 * @property {string} id
 * @property {string} label
 * @property {string} icon
 * @property {string} example
 */

/** @type {ReadonlyArray<ObjectiveSuggestion>} */
export const OBJECTIVE_SUGGESTIONS = Object.freeze([
  {
    id: 'teach',
    label: 'Ensinar',
    icon: 'graduation-cap',
    example:
      'Ajudar pessoas a aprender inteligência artificial de forma prática, clara e aplicada ao trabalho.',
  },
  {
    id: 'research',
    label: 'Pesquisar',
    icon: 'microscope',
    example:
      'Investigar um tema a fundo, reunir fontes confiáveis e entregar uma síntese honesta sobre o que se sabe e o que ainda é incerto.',
  },
  {
    id: 'create',
    label: 'Criar',
    icon: 'palette',
    example:
      'Gerar propostas criativas de conteúdo e ajudar a refiná-las até virarem algo publicável.',
  },
  {
    id: 'analyze',
    label: 'Analisar',
    icon: 'chart-line',
    example:
      'Analisar dados e situações de negócio para transformar números em decisões defensáveis.',
  },
  {
    id: 'code',
    label: 'Programar',
    icon: 'code',
    example:
      'Escrever, revisar e explicar código, priorizando soluções simples e testáveis.',
  },
  {
    id: 'plan',
    label: 'Planejar',
    icon: 'list-ordered',
    example:
      'Quebrar objetivos grandes em planos executáveis, com prioridades e riscos explícitos.',
  },
  {
    id: 'mentor',
    label: 'Orientar',
    icon: 'compass',
    example:
      'Orientar decisões de carreira e de produto fazendo as perguntas certas antes de dar respostas.',
  },
  {
    id: 'review',
    label: 'Revisar',
    icon: 'eye',
    example:
      'Revisar textos e entregas apontando problemas concretos e sugerindo melhorias específicas.',
  },
])
