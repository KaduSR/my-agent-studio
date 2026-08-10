// @ts-check
/**
 * Derived export artefacts (SPEC 37, 38, 39, 40).
 *
 * buildFileTree is the single place that decides what a preset produces. Both
 * the on-screen structure preview and the ZIP consume its output, so what the
 * user sees before exporting is what lands on disk.
 */

import { slugify } from '../lib/uuid.js'
import { getMemoryType, memoryOptionLabel } from '../data/memory.js'
import { getPreset } from './presets.js'
import {
  generateAgentMarkdown,
  heading,
  joinBlocks,
  memorySection,
  orderedRuleTexts,
  personalitySection,
  purposeSection,
  rulesSection,
  soulSection,
  toolsSection,
  enabledTools,
} from './markdown.js'

/** Bump when the exported shape changes in a way consumers must notice. */
export const SCHEMA_VERSION = 1

/**
 * @typedef {Object} ExportFile
 * @property {string} path    Path relative to the ZIP root, using forward slashes.
 * @property {string} content
 */

/**
 * The machine-readable twin of the agent (SPEC 39, SPEC 89).
 * @param {import('./types.js').Agent} agent
 * @returns {string}
 */
export function generateConfigJson(agent) {
  const config = {
    schemaVersion: SCHEMA_VERSION,
    version: '1.0',
    name: agent.name,
    description: agent.description ?? '',
    objective: agent.objective,
    avatar: agent.avatarId ?? '',
    soul: {
      mission: agent.soul.mission,
      essence: agent.soul.essence,
      philosophy: agent.soul.philosophy ?? '',
      values: agent.soul.values,
    },
    personality: {
      tones: agent.personality.tones,
      traits: agent.personality.traits,
      responseStyle: agent.personality.responseStyle,
      creativity: agent.personality.creativity,
      precision: agent.personality.precision,
      formality: agent.personality.formality,
      proactivity: agent.personality.proactivity,
      detail: agent.personality.detail,
      autonomy: agent.personality.autonomy,
    },
    tools: enabledTools(agent).map((tool) => ({
      id: tool.id,
      name: tool.name,
      purpose: tool.purpose ?? '',
      rules: tool.rules ?? [],
    })),
    memory: {
      type: agent.memory.type,
      remember: agent.memory.remember,
      restrictions: agent.memory.restrictions,
    },
    rules: orderedRuleTexts(agent),
  }

  return `${JSON.stringify(config, null, 2)}\n`
}

/**
 * @param {import('./types.js').Agent} agent
 * @returns {string}
 */
export function generateReadme(agent) {
  const name = agent.name.trim() || 'Agente sem nome'
  return `${joinBlocks(
    heading(1, name),
    agent.description?.trim() || agent.objective.trim(),
    heading(2, 'O que é isto'),
    'Esta pasta descreve um agente de IA: quem ele é, o que deve fazer, como se comunica e o que nunca pode fazer. Foi gerada pelo My Agent Studio.',
    heading(2, 'Arquivos'),
    [
      '- `AGENT.md` — documento principal, com tudo reunido.',
      '- `soul.md` — missão, essência e valores.',
      '- `personality.md` — tom de voz, traços e estilo de resposta.',
      '- `rules.md` — regras que o agente nunca deve violar.',
      '- `tools.md` — ferramentas que ele espera ter à disposição.',
      '- `memory.md` — o que ele deve e não deve lembrar.',
      '- `config.json` — a mesma configuração em formato legível por máquina.',
    ].join('\n'),
    heading(2, 'Como usar'),
    'Aponte sua ferramenta de agentes para `AGENT.md`, ou cole o conteúdo dele como instrução inicial do agente.'
  )}\n`
}

/**
 * CLAUDE.md aggregates the main instructions (SPEC 40).
 * @param {import('./types.js').Agent} agent
 * @returns {string}
 */
export function generateClaudeMarkdown(agent) {
  const name = agent.name.trim() || 'Agente sem nome'
  return `${joinBlocks(
    heading(1, name),
    agent.description?.trim() && `> ${agent.description.trim()}`,
    purposeSection(agent),
    soulSection(agent),
    personalitySection(agent),
    rulesSection(agent),
    toolsSection(agent),
    memorySection(agent),
    heading(2, 'Reference Files'),
    [
      '- `soul.md` — a essência completa.',
      '- `personality.md` — tom, traços e comportamento.',
      '- `rules.md` — regras inegociáveis.',
      '- `memory.md` — política de memória.',
      '- `references/` — coloque aqui documentos de apoio que o agente deve consultar.',
    ].join('\n')
  )}\n`
}

/**
 * @param {import('./types.js').Agent} agent
 * @returns {string}
 */
function generateMemoryFile(agent) {
  const type = getMemoryType(agent.memory.type)
  return `${joinBlocks(
    heading(1, 'Memory'),
    type && `Type: ${type.label}`,
    type && type.description,
    agent.memory.type !== 'none' &&
      agent.memory.remember.length > 0 &&
      joinBlocks(heading(2, 'Remember'), agent.memory.remember.map((id) => `- ${memoryOptionLabel(id)}`).join('\n')),
    agent.memory.restrictions.length > 0 &&
      joinBlocks(
        heading(2, 'Never Remember'),
        agent.memory.restrictions
          .map((entry) => entry.trim())
          .filter(Boolean)
          .map((entry) => `- ${entry}`)
          .join('\n')
      )
  )}\n`
}

/**
 * @param {string} title
 * @param {string} body
 * @returns {string}
 */
function standaloneDoc(title, body) {
  return `${joinBlocks(heading(1, title), body || '_Ainda não definido._')}\n`
}

const REFERENCES_README = `${joinBlocks(
  heading(1, 'References'),
  'Coloque nesta pasta os documentos que o agente deve consultar: guias de estilo, políticas internas, exemplos de resposta, glossários.',
  'Arquivos em Markdown funcionam melhor, porque o agente consegue citá-los diretamente.'
)}\n`

/**
 * Build the complete set of files for a preset.
 * @param {import('./types.js').Agent} agent
 * @param {import('./presets.js').PresetId} presetId
 * @returns {ExportFile[]}
 */
export function buildFileTree(agent, presetId) {
  const preset = getPreset(presetId)

  if (preset.id === 'markdown') {
    return [{ path: 'AGENT.md', content: generateAgentMarkdown(agent) }]
  }

  // Section bodies are re-rendered at level 1 so each file reads as its own document.
  const soul = soulSection(agent, 1)
  const personality = personalitySection(agent, 1)
  const rules = rulesSection(agent, 1)
  const tools = toolsSection(agent, 1)

  if (preset.id === 'claude-code') {
    return [
      { path: 'CLAUDE.md', content: generateClaudeMarkdown(agent) },
      { path: 'soul.md', content: soul ? `${soul}\n` : standaloneDoc('Soul', '') },
      { path: 'personality.md', content: personality ? `${personality}\n` : standaloneDoc('Personality', '') },
      { path: 'rules.md', content: rules ? `${rules}\n` : standaloneDoc('Hard Rules', '') },
      { path: 'memory.md', content: generateMemoryFile(agent) },
      { path: 'references/README.md', content: REFERENCES_README },
    ]
  }

  return [
    { path: 'AGENT.md', content: generateAgentMarkdown(agent) },
    { path: 'README.md', content: generateReadme(agent) },
    { path: 'soul.md', content: soul ? `${soul}\n` : standaloneDoc('Soul', '') },
    { path: 'personality.md', content: personality ? `${personality}\n` : standaloneDoc('Personality', '') },
    { path: 'rules.md', content: rules ? `${rules}\n` : standaloneDoc('Hard Rules', '') },
    { path: 'tools.md', content: tools ? `${tools}\n` : standaloneDoc('Tools', 'Nenhuma ferramenta selecionada.') },
    { path: 'memory.md', content: generateMemoryFile(agent) },
    { path: 'config.json', content: generateConfigJson(agent) },
  ]
}

/**
 * Root folder inside the ZIP (SPEC 37, SPEC 40).
 * @param {import('./types.js').Agent} agent
 * @param {import('./presets.js').PresetId} presetId
 * @returns {string}
 */
export function exportRootName(agent, presetId) {
  if (presetId === 'claude-code') return 'agent'
  return slugify(agent.name)
}
