// @ts-check
/**
 * Memory configuration (SPEC 31, 32, 33).
 *
 * SPEC 4.3 forbids leading with jargon, so each type is described by what the
 * user will actually experience rather than by how it would be implemented.
 */

/**
 * @typedef {Object} MemoryTypeOption
 * @property {import('../agent/types.js').MemoryType} id
 * @property {string} label
 * @property {string} icon
 * @property {string} description
 * @property {string} [tooltip]
 */

/** @type {ReadonlyArray<MemoryTypeOption>} */
export const MEMORY_TYPES = Object.freeze([
  {
    id: 'none',
    label: 'Sem memória',
    icon: 'circle-slash',
    description: 'Cada conversa começa do zero. Nada é levado adiante.',
  },
  {
    id: 'session',
    label: 'Memória de sessão',
    icon: 'clock',
    description: 'Lembra o que foi dito durante a conversa e esquece ao encerrá-la.',
  },
  {
    id: 'persistent',
    label: 'Memória persistente',
    icon: 'hard-drive',
    description: 'Guarda o que aprendeu sobre você entre conversas diferentes.',
    tooltip:
      'O agente mantém anotações entre sessões. Útil para continuidade, mas exige regras claras sobre o que ele pode guardar.',
  },
  {
    id: 'selective',
    label: 'Memória seletiva',
    icon: 'filter',
    description: 'Só guarda o que você marcar explicitamente como importante.',
  },
])

/**
 * The kinds of memory an agent can carry.
 *
 * A different axis from MEMORY_TYPES, and worth saying so out loud: those four
 * answer *for how long* the agent remembers, these answer *what shape* the
 * memory has. A team can want persistent retention and still only ever store
 * facts, never procedures.
 *
 * The context window is on the list even though nobody chooses it, because the
 * most useful thing a beginner can learn on this step is that it is the only
 * place the model actually reads. Everything else on the list is a strategy for
 * getting something back into it in time.
 *
 * @typedef {Object} MemoryKindOption
 * @property {string} id
 * @property {string} label
 * @property {string} icon
 * @property {string} description
 * @property {string} [tooltip]
 * @property {boolean} [always] True when every agent has it whether it is asked
 *   for or not, so the card is shown selected and explains why.
 */

/** @type {ReadonlyArray<MemoryKindOption>} */
export const MEMORY_KINDS = Object.freeze([
  {
    id: 'context-window',
    label: 'Janela de contexto',
    icon: 'app-window',
    description: 'O que cabe na conversa agora. É o único lugar em que o modelo realmente lê.',
    tooltip:
      'Todo agente tem uma, e ela tem tamanho fixo. Toda outra memória desta lista é uma estratégia para trazer a coisa certa de volta para dentro dela na hora certa.',
    always: true,
  },
  {
    id: 'episodic',
    label: 'Memória episódica',
    icon: 'clock',
    description: 'O que aconteceu: conversas anteriores, o que já foi tentado e como terminou.',
    tooltip:
      'É o diário do agente. Serve para não repetir um caminho que já falhou e para retomar de onde parou.',
  },
  {
    id: 'semantic',
    label: 'Memória semântica',
    icon: 'brain',
    description: 'O que é verdade: fatos sobre você, sobre o produto e sobre o domínio.',
    tooltip:
      'Fatos soltos do tempo em que foram aprendidos. "O cliente prefere e-mail curto" vale hoje e valia mês passado.',
  },
  {
    id: 'procedural',
    label: 'Memória procedimental',
    icon: 'list-ordered',
    description: 'Como fazer: o passo a passo que funcionou antes e deve ser repetido.',
    tooltip:
      'A receita, não o episódio. É o que transforma um acerto isolado em um jeito de trabalhar.',
  },
  {
    id: 'retrieval',
    label: 'Busca em base',
    icon: 'search',
    description: 'Nada fica na cabeça: o agente busca o trecho na hora e traz para a conversa.',
    tooltip:
      'É o RAG. Diferente das outras três, aqui o conteúdo nunca é do agente: ele vive numa base e é buscado a cada pergunta.',
  },
])

/**
 * @typedef {Object} MemoryOption
 * @property {string} id
 * @property {string} label
 */

/** SPEC 32. */
/** @type {ReadonlyArray<MemoryOption>} */
export const MEMORY_REMEMBER_OPTIONS = Object.freeze([
  { id: 'preferences', label: 'Lembrar preferências do usuário' },
  { id: 'projects', label: 'Lembrar projetos' },
  { id: 'decisions', label: 'Lembrar decisões anteriores' },
  { id: 'communication-style', label: 'Lembrar estilo de comunicação' },
  { id: 'work-context', label: 'Lembrar contexto de trabalho' },
])

/** SPEC 33 — offered as suggestions on top of the defaults from SPEC 77. */
/** @type {ReadonlyArray<string>} */
export const MEMORY_RESTRICTION_SUGGESTIONS = Object.freeze([
  'Nunca armazenar senhas',
  'Nunca armazenar tokens',
  'Nunca armazenar credenciais',
  'Nunca armazenar dados sensíveis sem autorização',
  'Permitir que o usuário solicite esquecimento',
])

/**
 * @param {import('../agent/types.js').MemoryType} id
 * @returns {MemoryTypeOption | undefined}
 */
export function getMemoryType(id) {
  return MEMORY_TYPES.find((type) => type.id === id)
}

/**
 * @param {string} id
 * @returns {string}
 */
export function memoryOptionLabel(id) {
  return MEMORY_REMEMBER_OPTIONS.find((option) => option.id === id)?.label ?? id
}

/**
 * @param {string} id
 * @returns {MemoryKindOption | undefined}
 */
export function getMemoryKind(id) {
  return MEMORY_KINDS.find((kind) => kind.id === id)
}

/** The kinds every agent carries whether or not anyone picked them. */
export const ALWAYS_MEMORY_KINDS = Object.freeze(
  MEMORY_KINDS.filter((kind) => kind.always).map((kind) => kind.id)
)
