// @ts-check
/** Step 1 — Nome (SPEC 17). */

import { h } from '../lib/dom.js'
import { textField } from '../ui/field.js'
import { LIMITS } from '../agent/validate.js'
import { builderStore, updateAgentFields } from '../stores/builder-store.js'
import { agentPortrait } from '../components/agent-portrait.js'
import { section, stepShell } from './step-shell.js'

/** @returns {import('./step-shell.js').StepView} */
export function identityStep() {
  const agent = builderStore.getState().agent
  const portrait = agentPortrait()

  const name = textField({
    label: 'Nome do agente',
    value: agent.name,
    placeholder: 'Assistente de Aprendizado',
    maxLength: LIMITS.nameMax,
    required: true,
    autofocus: true,
    validateAs: 'name',
    helper: 'É assim que seu agente vai se apresentar.',
    onInput: (value) => updateAgentFields({ name: value }),
  })

  const description = textField({
    label: 'Descrição curta',
    value: agent.description ?? '',
    placeholder: 'Seu mentor pessoal para aprender inteligência artificial.',
    maxLength: LIMITS.descriptionMax,
    validateAs: 'description',
    helper: 'Opcional. Uma linha que explica para quem ele existe.',
    onInput: (value) => updateAgentFields({ description: value }),
  })

  const element = stepShell(
    'identity',
    section({ title: 'Retrato', emoji: '🤖' }, portrait.element),
    section(
      { title: 'Identidade', emoji: '🪪' },
      h('div', { class: 'field-stack' }, name.element, description.element)
    )
  )

  return { element, destroy: portrait.destroy }
}
