// @ts-check
/** Export presets (SPEC 36, 37, 40). */

/**
 * @typedef {'markdown' | 'generic' | 'claude-code'} PresetId
 */

/**
 * @typedef {Object} PresetDefinition
 * @property {PresetId} id
 * @property {string} label
 * @property {string} icon
 * @property {string} description
 * @property {string} rootHint Folder name shown in the structure preview.
 */

/** @type {ReadonlyArray<PresetDefinition>} */
export const PRESETS = Object.freeze([
  {
    id: 'markdown',
    label: 'Markdown',
    icon: 'file-text',
    description: 'Um único arquivo AGENT.md com tudo dentro.',
    rootHint: '',
  },
  {
    id: 'generic',
    label: 'Generic Agent',
    icon: 'folder-tree',
    description: 'Estrutura completa de pastas, com um arquivo por tema e config.json.',
    rootHint: '{slug}/',
  },
  {
    id: 'claude-code',
    label: 'Claude Code',
    icon: 'terminal',
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
 * @param {string} value
 * @returns {value is PresetId}
 */
export function isPresetId(value) {
  return PRESETS.some((preset) => preset.id === value)
}
