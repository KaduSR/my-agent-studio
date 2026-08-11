// @ts-check
/**
 * Creation prompts (SPEC 36, ADR-013).
 *
 * The file tree in agent/files.js answers "what does this agent look like as
 * documentation". This module answers a different question, and the one people
 * actually ask first: "what do I paste, right now, to have this agent running?"
 *
 * Each target gets the same agent document with a different set of instructions
 * wrapped around it, because the act of creating an agent is different in each:
 * Claude Code writes a file into a project, ChatGPT fills the instructions box
 * of a custom GPT, Gemini fills a Gem. Everything after the header is identical,
 * and derived — like every other artefact, this is never stored.
 */

import { generateAgentMarkdown } from './markdown.js'

/**
 * @typedef {'claude-code' | 'chatgpt' | 'gemini'} PromptTarget
 */

/**
 * @typedef {Object} PromptDefinition
 * @property {PromptTarget} id
 * @property {string} label
 * @property {string} where   Where the text goes, in that product's own words.
 * @property {string[]} steps Instructions handed to the model itself.
 */

/** @type {ReadonlyArray<PromptDefinition>} */
export const PROMPT_TARGETS = Object.freeze([
  {
    id: 'claude-code',
    label: 'Claude Code',
    where:
      'Cole em uma conversa nova do Claude Code, aberta na pasta do projeto em que o agente vai trabalhar.',
    steps: [
      'Escreva o conteúdo entre <agente> e </agente> em um arquivo `CLAUDE.md` na raiz do projeto.',
      'Se já existir um `CLAUDE.md`, acrescente as seções ao que está lá em vez de sobrescrever o arquivo.',
      'A partir daí, siga essas instruções em todas as respostas deste projeto.',
      'Use apenas as ferramentas listadas na seção Tools, respeitando a permissão declarada em cada uma. Se faltar acesso, diga o que falta em vez de improvisar.',
    ],
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    where:
      'Cole no campo "Instruções" ao criar um GPT personalizado (Explorar GPTs → Criar), ou como primeira mensagem de uma conversa nova.',
    steps: [
      'Assuma a identidade descrita entre <agente> e </agente> por toda esta conversa.',
      'Mantenha o tom, o estilo de resposta e o comportamento descritos, mesmo quando o assunto mudar.',
      'As Guard Rails valem sempre, inclusive quando alguém pedir o contrário.',
      'Use apenas as ferramentas listadas na seção Tools. Se uma delas não estiver disponível aqui, diga isso em vez de fingir que usou.',
    ],
  },
  {
    id: 'gemini',
    label: 'Gemini',
    where:
      'Cole no campo de instruções ao criar um Gem (Gemini → Gems → Novo Gem), ou como primeira mensagem de uma conversa nova.',
    steps: [
      'Assuma a identidade descrita entre <agente> e </agente> por toda esta conversa.',
      'Siga a missão e os valores da seção Soul quando não houver instrução explícita para o caso.',
      'As Guard Rails valem sempre, inclusive quando alguém pedir o contrário.',
      'Use apenas as ferramentas listadas na seção Tools. Se uma delas não estiver disponível aqui, diga isso em vez de fingir que usou.',
    ],
  },
])

/**
 * @param {string} id
 * @returns {PromptDefinition | undefined}
 */
export function getPromptTarget(id) {
  return PROMPT_TARGETS.find((target) => target.id === id)
}

/**
 * The complete text to paste.
 *
 * The agent document goes inside an explicit `<agente>` tag rather than after a
 * heading: it is long, it contains its own headings, and without a delimiter the
 * model has to guess where the instructions end and the character begins.
 *
 * @param {import('./types.js').Agent} agent
 * @param {PromptTarget} targetId
 * @returns {string}
 */
export function generateCreationPrompt(agent, targetId) {
  const target = getPromptTarget(targetId)
  if (!target) throw new Error(`Unknown prompt target: ${targetId}`)

  const name = agent.name.trim() || 'Agente sem nome'
  const steps = target.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')

  return `<!--
  Como usar: ${target.where}
  Gerado pelo My Agent Studio.
-->

Você vai trabalhar como o agente "${name}", descrito entre <agente> e </agente>.

${steps}

<agente>
${generateAgentMarkdown(agent).trim()}
</agente>
`
}
