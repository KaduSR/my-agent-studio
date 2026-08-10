// @ts-check
/** Step 5 — Guard Rails (SPEC 27, 28). */

import { h, on, setChildren } from '../lib/dom.js'
import { icon } from '../icons.js'
import { LIMITS } from '../agent/validate.js'
import { RULE_SUGGESTIONS } from '../data/rule-suggestions.js'
import { addRule, builderStore } from '../stores/builder-store.js'
import { sortableRules } from '../components/sortable-rules.js'
import { emptyState, reactiveBlock, section, stepShell } from './step-shell.js'

/** @returns {import('./step-shell.js').StepView} */
export function rulesStep() {
  const rules = sortableRules()

  const input = h('input', {
    type: 'text',
    class: 'input',
    placeholder: 'Nunca prometa resultados que não pode garantir.',
    maxlength: String(LIMITS.ruleMax),
    'aria-label': 'Nova regra',
  })

  const submit = () => {
    const value = input.value.trim()
    if (!value) return
    addRule(value)
    input.value = ''
    input.focus()
  }

  on(input, 'keydown', (event) => {
    if (/** @type {KeyboardEvent} */ (event).key !== 'Enter') return
    event.preventDefault()
    submit()
  })

  const addRow = h(
    'div',
    { class: 'add-row' },
    input,
    h(
      'button',
      { type: 'button', class: 'btn btn-secondary', onclick: submit },
      icon('plus', { size: 15 }),
      'Adicionar regra'
    )
  )

  // The list and the empty state swap based on whether any rule exists.
  const listArea = reactiveBlock(
    (state) => state.agent.guardRails.length === 0,
    (container) => {
      const isEmpty = builderStore.getState().agent.guardRails.length === 0
      setChildren(
        container,
        isEmpty
          ? emptyState({
              iconName: 'shield-check',
              title: 'Nenhuma regra definida.',
              description:
                'Sem regras, seu agente decide sozinho o que pode e o que não pode. Adicione ao menos os limites que você não quer ver ultrapassados.',
            })
          : rules.element
      )
    }
  )

  const suggestions = reactiveBlock(
    (state) => state.agent.guardRails.map((rule) => rule.text.trim().toLowerCase()).join('|'),
    (container) => {
      const existing = new Set(
        builderStore.getState().agent.guardRails.map((rule) => rule.text.trim().toLowerCase())
      )
      const available = RULE_SUGGESTIONS.filter(
        (suggestion) => !existing.has(suggestion.toLowerCase())
      )

      setChildren(
        container,
        available.length === 0
          ? h('p', { class: 'helper' }, 'Todas as sugestões já foram adicionadas.')
          : h(
              'div',
              { class: 'suggestion-row' },
              ...available.map((suggestion) =>
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'suggestion',
                    onclick: () => addRule(suggestion),
                  },
                  icon('plus', { size: 14 }),
                  suggestion
                )
              )
            )
      )
    }
  )

  const element = stepShell(
    'rules',
    section(
      {
        title: 'Regras do agente',
        emoji: '🛡️',
        description: 'Valem em toda conversa, na ordem em que aparecem aqui.',
      },
      listArea.element,
      addRow
    ),
    section({ title: 'Sugestões', emoji: '💡', description: 'Regras comuns que costumam evitar problemas.' }, suggestions.element)
  )

  return {
    element,
    destroy: () => {
      rules.destroy()
      listArea.destroy()
      suggestions.destroy()
    },
  }
}
