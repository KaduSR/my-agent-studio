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
