// @ts-check
/** Step 7 — Memória (SPEC 31, 32, 33). */

import { h, on, setChildren } from '../lib/dom.js'
import { icon } from '../icons.js'
import { LIMITS } from '../agent/validate.js'
import {
  MEMORY_KINDS,
  MEMORY_REMEMBER_OPTIONS,
  MEMORY_RESTRICTION_SUGGESTIONS,
  MEMORY_TYPES,
} from '../data/memory.js'
import {
  addRestriction,
  builderStore,
  removeRestriction,
  setMemoryType,
  toggleMemoryKind,
  toggleRemember,
} from '../stores/builder-store.js'
import { optionCard, traitChip, wireRadioGroup } from '../ui/option-card.js'
import { reactiveBlock, section, stepShell } from './step-shell.js'

/** @returns {import('./step-shell.js').StepView} */
export function memoryStep() {
  const types = reactiveBlock(
    (state) => state.agent.memory.type,
    (container) => {
      const current = builderStore.getState().agent.memory.type
      const group = h(
        'div',
        { class: 'card-list', 'aria-label': 'Tipo de memória' },
        ...MEMORY_TYPES.map((type) =>
          optionCard({
            role: 'radio',
            layout: 'row',
            label: type.label,
            description: type.description,
            iconName: type.icon,
            focusKey: `memtype-${type.id}`,
            selected: type.id === current,
            onToggle: () => setMemoryType(type.id),
          })
        )
      )
      wireRadioGroup(group)
      setChildren(container, group)
    }
  )

  /*
   * A different axis from the one above: those four say for how long the agent
   * remembers, these say what shape the memory has. The window is on the list
   * even though nobody picks it, because knowing it is the only place the model
   * reads is the most useful thing this step can teach.
   */
  const kinds = reactiveBlock(
    (state) => state.agent.memory.kinds,
    (container) => {
      const chosen = builderStore.getState().agent.memory.kinds

      setChildren(
        container,
        h(
          'div',
          { class: 'card-list', 'aria-label': 'Tipos de memória' },
          ...MEMORY_KINDS.map((kind) =>
            optionCard({
              role: 'checkbox',
              layout: 'row',
              label: kind.label,
              description: kind.description,
              iconName: kind.icon,
              focusKey: `memkind-${kind.id}`,
              selected: chosen.includes(kind.id),
              blocked: kind.always,
              blockedHint: kind.tooltip,
              onToggle: () => toggleMemoryKind(kind.id),
            })
          )
        )
      )
    }
  )

  const remember = reactiveBlock(
    (state) => ({ type: state.agent.memory.type, remember: state.agent.memory.remember }),
    (container) => {
      const memory = builderStore.getState().agent.memory
      const disabled = memory.type === 'none'

      setChildren(
        container,
        disabled
          ? h(
              'p',
              { class: 'helper' },
              'Com "Sem memória" selecionado, o agente não guarda nada entre conversas.'
            )
          : h(
              'div',
              { class: 'chip-row', role: 'group', 'aria-label': 'O que lembrar' },
              ...MEMORY_REMEMBER_OPTIONS.map((option) =>
                traitChip({
                  label: option.label,
                  focusKey: `remember-${option.id}`,
                  selected: memory.remember.includes(option.id),
                  onToggle: () => toggleRemember(option.id),
                })
              )
            )
      )
    }
  )

  const input = h('input', {
    type: 'text',
    class: 'input',
    placeholder: 'Nunca armazenar dados de clientes.',
    maxlength: String(LIMITS.restrictionMax),
    'aria-label': 'Nova restrição',
  })

  const submit = () => {
    const value = input.value.trim()
    if (!value) return
    addRestriction(value)
    input.value = ''
    input.focus()
  }

  on(input, 'keydown', (event) => {
    if (/** @type {KeyboardEvent} */ (event).key !== 'Enter') return
    event.preventDefault()
    submit()
  })

  const restrictions = reactiveBlock(
    (state) => state.agent.memory.restrictions.join('|'),
    (container) => {
      const current = builderStore.getState().agent.memory.restrictions
      const available = MEMORY_RESTRICTION_SUGGESTIONS.filter(
        (suggestion) =>
          !current.some((entry) => entry.toLowerCase().replace(/\.$/, '') === suggestion.toLowerCase())
      )

      setChildren(
        container,
        h(
          'ul',
          { class: 'restriction-list' },
          ...current.map((restriction, index) =>
            h(
              'li',
              { class: 'restriction' },
              h('span', { class: 'restriction__icon' }, icon('shield-check', { size: 15 })),
              h('span', { class: 'restriction__text' }, restriction),
              h(
                'button',
                {
                  type: 'button',
                  class: 'rule__delete',
                  'aria-label': `Remover restrição: ${restriction}`,
                  onclick: () => removeRestriction(index),
                },
                icon('x', { size: 15 })
              )
            )
          )
        ),
        h('div', { class: 'add-row' }, input, h(
          'button',
          { type: 'button', class: 'btn btn-secondary', onclick: submit },
          icon('plus', { size: 15 }),
          'Adicionar'
        )),
        available.length > 0
          ? h(
              'div',
              { class: 'suggestion-row' },
              ...available.map((suggestion) =>
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'suggestion',
                    onclick: () => addRestriction(suggestion),
                  },
                  icon('plus', { size: 14 }),
                  suggestion
                )
              )
            )
          : null
      )
    }
  )

  const element = stepShell(
    'memory',
    section({ title: 'Quanto ele deve lembrar?', emoji: '⏳' }, types.element),
    section(
      {
        title: 'Tipos de memória',
        emoji: '🧠',
        description:
          'O que ele guarda, e em que forma. A janela de contexto todo agente tem: é o único lugar em que o modelo lê, e as outras são maneiras de trazer a coisa certa de volta para dentro dela.',
      },
      kinds.element
    ),
    section(
      { title: 'O que vale a pena lembrar', emoji: '📌', description: 'Marque o que ajuda seu agente a continuar de onde parou.' },
      remember.element
    ),
    section(
      {
        title: 'O que ele nunca deve guardar',
        emoji: '🚫',
        description: 'Estas restrições entram no documento final e valem sempre.',
      },
      restrictions.element
    )
  )

  return {
    element,
    destroy: () => {
      types.destroy()
      kinds.destroy()
      remember.destroy()
      restrictions.destroy()
    },
  }
}
