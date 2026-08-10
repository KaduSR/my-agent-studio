// @ts-check
/** Step 3 — Soul (SPEC 20, 21, 59). */

import { h, setChildren } from '../lib/dom.js'
import { textField } from '../ui/field.js'
import { LIMITS } from '../agent/validate.js'
import { SOUL_FIELDS, SOUL_VALUES } from '../data/soul-values.js'
import { builderStore, toggleSoulValue, updateSoul } from '../stores/builder-store.js'
import { traitChip } from '../ui/option-card.js'
import { emptyState, reactiveBlock, section, stepShell } from './step-shell.js'

/** @returns {import('./step-shell.js').StepView} */
export function soulStep() {
  const agent = builderStore.getState().agent
  let started =
    agent.soul.mission.trim().length > 0 ||
    agent.soul.essence.trim().length > 0 ||
    (agent.soul.philosophy ?? '').trim().length > 0 ||
    agent.soul.values.length > 0

  const fieldsHost = h('div', { class: 'field-stack' })

  const renderFields = () => {
    setChildren(
      fieldsHost,
      ...SOUL_FIELDS.map((definition, index) => {
        const field = textField({
          label: definition.label,
          value: agent.soul[definition.id] ?? '',
          placeholder: definition.placeholder,
          maxLength: LIMITS.soulFieldMax,
          multiline: true,
          rows: 3,
          autofocus: started && index === 0,
          validateAs: 'soulField',
          helper: definition.optional
            ? `${definition.question} (opcional)`
            : definition.question,
          onInput: (value) => updateSoul({ [definition.id]: value }),
        })
        return field.element
      })
    )
  }

  const body = h('div', { class: 'soul-body' })

  const renderBody = () => {
    if (!started) {
      setChildren(
        body,
        emptyState({
          iconName: 'heart',
          title: 'Seu agente ainda não possui uma Soul.',
          description: 'Defina os princípios que devem orientar suas decisões.',
          actionLabel: 'Criar Soul',
          onAction: () => {
            started = true
            renderBody()
          },
        })
      )
      return
    }

    renderFields()
    setChildren(body, fieldsHost)
  }

  const values = reactiveBlock(
    (state) => state.agent.soul.values,
    (container) => {
      const selected = builderStore.getState().agent.soul.values
      setChildren(
        container,
        h(
          'div',
          { class: 'chip-row' },
          ...SOUL_VALUES.map((value) =>
            traitChip({
              label: value.label,
              focusKey: `soulvalue-${value.id}`,
              selected: selected.includes(value.id),
              onToggle: () => toggleSoulValue(value.id),
            })
          )
        )
      )
    }
  )

  renderBody()

  const element = stepShell(
    'soul',
    section(
      { title: 'Princípios', emoji: '❤️', description: 'O que deve orientar o agente quando ele precisar escolher.' },
      body
    ),
    section(
      {
        title: 'Valores',
        emoji: '✨',
        description: 'Marque o que precisa estar sempre presente nas respostas dele.',
      },
      values.element
    )
  )

  return { element, destroy: values.destroy }
}
