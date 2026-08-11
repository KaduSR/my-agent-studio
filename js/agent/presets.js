// @ts-check
/**
 * Export presets (SPEC 36, 37, 40).
 *
 * Grouped into families, because the six options answer three different
 * questions and a flat list made them look interchangeable:
 *
 * - `prompt`: what do I paste right now to have this agent running?
 * - `doc`: give me the whole thing as one file I can read or attach.
 * - `kit`: give me the folder a repository should carry.
 */

/**
 * @typedef {'prompt-claude-code' | 'prompt-chatgpt' | 'prompt-gemini'
 *   | 'markdown' | 'generic' | 'claude-code'} PresetId
 */

/** @typedef {'prompt' | 'doc' | 'kit'} PresetFamily */

/**
 * @typedef {Object} PresetFamilyDefinition
 * @property {PresetFamily} id
 * @property {string} label
 * @property {string} description
 */

/** @type {ReadonlyArray<PresetFamilyDefinition>} */
export const PRESET_FAMILIES = Object.freeze([
  {
    id: 'prompt',
    label: 'Prompt de criação',
    description: 'Um texto pronto para colar na ferramenta e já sair usando.',
  },
  {
    id: 'doc',
    label: 'Documento único',
    description: 'Tudo em um arquivo só, para ler, anexar ou versionar.',
  },
  {
    id: 'kit',
    label: 'Kit para ferramentas',
    description: 'A pasta completa, com um arquivo por tema.',
  },
])

/**
 * @typedef {Object} PresetDefinition
 * @property {PresetId} id
 * @property {PresetFamily} family
 * @property {string} label
 * @property {string} icon
 * @property {string} description
 * @property {string} rootHint Folder name shown in the structure preview.
 * @property {import('./prompts.js').PromptTarget} [promptTarget]
 */

/** @type {ReadonlyArray<PresetDefinition>} */
export const PRESETS = Object.freeze([
  {
    id: 'prompt-claude-code',
    family: 'prompt',
    label: 'Prompt para Claude Code',
    icon: 'terminal',
    description: 'Manda o Claude Code criar o CLAUDE.md e assumir o agente no projeto.',
    rootHint: '',
    promptTarget: 'claude-code',
  },
  {
    id: 'prompt-chatgpt',
    family: 'prompt',
    label: 'Prompt para ChatGPT',
    icon: 'message-square',
    description: 'Para o campo de instruções de um GPT personalizado, ou para colar na conversa.',
    rootHint: '',
    promptTarget: 'chatgpt',
  },
  {
    id: 'prompt-gemini',
    family: 'prompt',
    label: 'Prompt para Gemini',
    icon: 'sparkles',
    description: 'Para as instruções de um Gem, ou para colar na conversa.',
    rootHint: '',
    promptTarget: 'gemini',
  },
  {
    id: 'markdown',
    family: 'doc',
    label: 'Markdown único',
    icon: 'file-text',
    description: 'Um único arquivo AGENT.md com tudo dentro.',
    rootHint: '',
  },
  {
    id: 'generic',
    family: 'kit',
    label: 'Generic Agent',
    icon: 'folder-tree',
    description: 'Estrutura completa de pastas, com um arquivo por tema e config.json.',
    rootHint: '{slug}/',
  },
  {
    id: 'claude-code',
    family: 'kit',
    label: 'Claude Code',
    icon: 'package',
    description: 'CLAUDE.md agregando as instruções, mais os arquivos de apoio e references/.',
    rootHint: 'agent/',
  },
])

/** @type {PresetId} */
export const DEFAULT_PRESET = 'generic'

/**
 * @param {PresetId} id
 * @returns {PresetDefinition}
 */
export function getPreset(id) {
  const preset = PRESETS.find((candidate) => candidate.id === id)
  if (!preset) throw new Error(`Unknown export preset: ${id}`)
  return preset
}

/**
 * @param {PresetFamily} family
 * @returns {PresetDefinition[]}
 */
export function presetsInFamily(family) {
  return PRESETS.filter((preset) => preset.family === family)
}

/**
 * @param {string} value
 * @returns {value is PresetId}
 */
export function isPresetId(value) {
  return PRESETS.some((preset) => preset.id === value)
}
