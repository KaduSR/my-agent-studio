// @ts-check
/**
 * Labelled text fields with live counters and validation (SPEC 17, 18, 20).
 *
 * ADR-007 allows skipping a form library for store-connected inputs, and these
 * are exactly that: the DOM owns the value, `input` pushes it to the store, and
 * nothing re-renders the field underneath the caret.
 */

import { h, on } from '../lib/dom.js'
import { validateField } from '../agent/validate.js'
import { labelWithTooltip } from './tooltip.js'

let counter = 0

/**
 * @typedef {Object} TextFieldConfig
 * @property {string} label
 * @property {string} value
 * @property {(value: string) => void} onInput
 * @property {string} [placeholder]
 * @property {number} [maxLength]
 * @property {string} [helper]
 * @property {string} [tooltip]
 * @property {boolean} [multiline]
 * @property {number} [rows]
 * @property {boolean} [required]
 * @property {boolean} [autofocus]
 * @property {Parameters<typeof validateField>[0]} [validateAs]
 */

/**
 * @param {TextFieldConfig} config
 * @returns {{ element: HTMLElement, input: HTMLInputElement | HTMLTextAreaElement }}
 */
export function textField(config) {
  const id = `field-${(counter += 1)}`
  const helperId = `${id}-helper`

  const input = config.multiline
    ? h('textarea', {
        id,
        class: 'textarea',
        rows: String(config.rows ?? 4),
        placeholder: config.placeholder ?? '',
        maxlength: config.maxLength ? String(config.maxLength) : null,
        'aria-describedby': helperId,
        'aria-required': config.required ? 'true' : null,
      })
    : h('input', {
        id,
        type: 'text',
        class: 'input',
        placeholder: config.placeholder ?? '',
        maxlength: config.maxLength ? String(config.maxLength) : null,
        'aria-describedby': helperId,
        'aria-required': config.required ? 'true' : null,
      })

  input.value = config.value

  const count = config.maxLength
    ? h('span', { class: 'field__count' }, `${config.value.length}/${config.maxLength}`)
    : null

  const message = h('span', { class: 'field__message helper' }, config.helper ?? '')

  /**
   * A pristine field must not accuse the user of anything. "Required" only
   * becomes an error once they have engaged with the field — otherwise every
   * new agent opens to a form already painted red.
   */
  let touched = false

  /** @param {boolean} [notify] */
  const sync = (notify = true) => {
    const value = input.value
    if (count && config.maxLength) {
      count.textContent = `${value.length}/${config.maxLength}`
      count.dataset.near = String(value.length > config.maxLength * 0.9)
    }

    const error = config.validateAs ? validateField(config.validateAs, value) : null
    // An empty optional field reads as guidance, never as a failure.
    const showError =
      Boolean(error) && touched && (config.required || value.trim().length > 0)

    input.setAttribute('aria-invalid', showError ? 'true' : 'false')
    message.textContent = showError ? /** @type {string} */ (error) : (config.helper ?? '')
    message.classList.toggle('helper-error', showError)

    if (notify) config.onInput(value)
  }

  on(input, 'input', () => {
    touched = true
    sync()
  })

  // Leaving a field the user did visit is the other moment worth flagging.
  on(input, 'blur', () => {
    if (input.value.length === 0 && !touched) return
    touched = true
    sync(false)
  })

  sync(false)

  const element = h(
    'div',
    { class: 'field' },
    h(
      'div',
      { class: 'field__header' },
      h('label', { class: 'field-label', htmlFor: id }, labelWithTooltip(config.label, config.tooltip)),
      count
    ),
    input,
    h('div', { class: 'field__footer', id: helperId }, message)
  )

  // Autofocus only where it helps. On a phone it would pop the keyboard and
  // scroll the portrait out of view the moment the step opens; preventScroll
  // keeps even the desktop case from yanking the panel.
  if (config.autofocus && window.matchMedia('(min-width: 1024px)').matches) {
    requestAnimationFrame(() => input.focus({ preventScroll: true }))
  }

  return { element, input }
}
