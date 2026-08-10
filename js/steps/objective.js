// @ts-check
/** Step 2 — Objetivo macro (SPEC 18, 19). */

import { h } from '../lib/dom.js'
import { icon } from '../icons.js'
import { textField } from '../ui/field.js'
import { LIMITS } from '../agent/validate.js'
import { builderStore, updateAgentFields } from '../stores/builder-store.js'
import { OBJECTIVE_SUGGESTIONS } from '../data/objective-suggestions.js'
import { section, stepShell } from './step-shell.js'

/** @returns {import('./step-shell.js').StepView} */
export function objectiveStep() {
  const agent = builderStore.getState().agent

  const objective = textField({
    label: 'O que este agente existe para fazer?',
    value: agent.objective,
    placeholder:
      'Ajudar pessoas a aprender inteligência artificial de forma prática, clara e aplicada ao trabalho.',
    maxLength: LIMITS.objectiveMax,
    multiline: true,
    rows: 5,
    required: true,
    autofocus: true,
    validateAs: 'objective',
    helper: 'Uma frase clara vale mais do que um parágrafo genérico.',
    onInput: (value) => updateAgentFields({ objective: value }),
  })

  const suggestions = h(
    'div',
    { class: 'suggestion-row' },
    ...OBJECTIVE_SUGGESTIONS.map((suggestion) =>
      h(
        'button',
        {
          type: 'button',
          class: 'suggestion',
          title: suggestion.example,
          onclick: () => {
            // Filling the field is the point of the suggestion: it shows the
            // shape of a good objective instead of leaving a blank page.
            const input = /** @type {HTMLTextAreaElement} */ (objective.input)
            input.value = suggestion.example
            input.dispatchEvent(new Event('input', { bubbles: true }))
            input.focus()
          },
        },
        icon(/** @type {any} */ (suggestion.icon), { size: 14 }),
        suggestion.label
      )
    )
  )

  const element = stepShell(
    'objective',
    section({ title: 'Objetivo macro', emoji: '🎯' }, objective.element),
    section(
      {
        title: 'Precisa de um ponto de partida?',
        emoji: '💡',
        description: 'Escolha um verbo e preencheremos um exemplo que você pode editar.',
      },
      suggestions
    )
  )

  return { element }
}
