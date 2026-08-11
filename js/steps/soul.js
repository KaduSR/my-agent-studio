// @ts-check
/**
 * Step 3 — Soul (SPEC 20, 21, 59).
 *
 * The three fields ask questions nobody has a ready answer for, so the base
 * souls come first: one click fills all of them from an archetype, and the user
 * edits from there. Same reasoning as the behaviour presets one step later.
 *
 * The fields own their DOM value (ADR-007), which is why they are built once and
 * never re-rendered: rebuilding them under the caret would drop it. A preset
 * therefore writes to the store *and* pushes the new text into each control by
 * hand, exactly like syncSliders() does in the Personality step.
 */

import { h, setChildren } from '../lib/dom.js'
import { icon } from '../icons.js'
import { textField } from '../ui/field.js'
import { LIMITS } from '../agent/validate.js'
import { SOUL_FIELDS, SOUL_VALUES } from '../data/soul-values.js'
import { SOUL_PRESETS } from '../data/soul-presets.js'
import {
  applySoulPreset,
  builderStore,
  toggleSoulValue,
  updateSoul,
} from '../stores/builder-store.js'
import { traitChip } from '../ui/option-card.js'
import { showToast } from '../ui/toast.js'
import { emptyState, reactiveBlock, section, stepShell } from './step-shell.js'

/** @returns {import('./step-shell.js').StepView} */
export function soulStep() {
  const initial = builderStore.getState().agent.soul
  let started =
    initial.mission.trim().length > 0 ||
    initial.essence.trim().length > 0 ||
    (initial.philosophy ?? '').trim().length > 0 ||
    initial.values.length > 0

  /**
   * True while a preset is pushing text into the fields, so their own `input`
   * handler does not write each value back one at a time — the preset already
   * landed as a single store revision.
   */
  let applying = false

  const fields = SOUL_FIELDS.map((definition, index) =>
    textField({
      label: definition.label,
      value: initial[definition.id] ?? '',
      placeholder: definition.placeholder,
      maxLength: LIMITS.soulFieldMax,
      multiline: true,
      rows: 3,
      autofocus: started && index === 0,
      validateAs: 'soulField',
      helper: definition.optional ? `${definition.question} (opcional)` : definition.question,
      onInput: (value) => {
        if (!applying) updateSoul({ [definition.id]: value })
      },
    })
  )

  const fieldsHost = h('div', { class: 'field-stack' }, ...fields.map((field) => field.element))

  /** Read the current Soul back into the three controls. @returns {void} */
  const syncFields = () => {
    const soul = builderStore.getState().agent.soul
    applying = true
    SOUL_FIELDS.forEach((definition, index) => {
      const input = fields[index].input
      input.value = soul[definition.id] ?? ''
      // The field keeps its own counter and validation state, and `input` is how
      // it hears about a change it did not make itself.
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    applying = false
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
            focusFirstField()
          },
        })
      )
      return
    }

    setChildren(body, fieldsHost)
  }

  /**
   * Mirrors the autofocus rule in textField: on a phone this would pop the
   * keyboard and scroll the step out of view.
   *
   * Synchronous on purpose. textField defers its own autofocus because the field
   * is not in the document yet when it is built; here renderBody() has just
   * attached it, and a deferred focus could land after the user had already
   * clicked into another field and started typing.
   *
   * @returns {void}
   */
  const focusFirstField = () => {
    if (!window.matchMedia('(min-width: 1024px)').matches) return
    fields[0].input.focus({ preventScroll: true })
  }

  const presets = h(
    'div',
    { class: 'behavior-presets', role: 'group', 'aria-label': 'Souls base' },
    ...SOUL_PRESETS.map((preset) =>
      h(
        'button',
        {
          type: 'button',
          class: 'behavior-preset',
          title: preset.description,
          onclick: () => {
            if (!started) {
              started = true
              renderBody()
            }
            applySoulPreset(preset.id)
            syncFields()
            showToast({ message: `Soul ${preset.label} aplicada.`, variant: 'success' })
          },
        },
        icon(/** @type {any} */ (preset.icon), { size: 15 }),
        h('span', null, preset.label)
      )
    )
  )

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
      h('p', { class: 'helper' }, 'Comece de um arquétipo e ajuste depois.'),
      presets,
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
