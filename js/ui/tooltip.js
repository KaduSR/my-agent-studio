// @ts-check
/**
 * Tooltips for the less obvious concepts (SPEC 60).
 *
 * Shown on hover *and* on keyboard focus, dismissible with Escape, and wired
 * with aria-describedby so the text is announced rather than merely drawn.
 */

import { h, on } from '../lib/dom.js'
import { icon } from '../icons.js'

let counter = 0

/**
 * An info affordance that reveals an explanation.
 * @param {string} text
 * @param {string} [label] Accessible name for the trigger.
 * @returns {HTMLElement}
 */
export function infoTooltip(text, label = 'O que é isto?') {
  const id = `tooltip-${(counter += 1)}`

  const bubble = h('span', { class: 'tooltip__bubble', id, role: 'tooltip', hidden: true }, text)

  const trigger = h(
    'button',
    {
      type: 'button',
      class: 'tooltip__trigger',
      'aria-label': label,
      'aria-describedby': id,
    },
    icon('info', { size: 14 })
  )

  const wrapper = h('span', { class: 'tooltip' }, trigger, bubble)

  /** @param {boolean} visible */
  const setVisible = (visible) => {
    bubble.hidden = !visible
  }

  on(trigger, 'pointerenter', () => setVisible(true))
  on(trigger, 'pointerleave', () => setVisible(false))
  on(trigger, 'focus', () => setVisible(true))
  on(trigger, 'blur', () => setVisible(false))
  on(trigger, 'click', (event) => {
    event.preventDefault()
    setVisible(bubble.hidden)
  })
  on(trigger, 'keydown', (event) => {
    if (/** @type {KeyboardEvent} */ (event).key === 'Escape') setVisible(false)
  })

  return wrapper
}

/**
 * Compose a label with its tooltip.
 * @param {string} text
 * @param {string} [tooltip]
 * @returns {HTMLElement}
 */
export function labelWithTooltip(text, tooltip) {
  return h(
    'span',
    { class: 'label-with-tooltip' },
    text,
    tooltip ? infoTooltip(tooltip, `Sobre ${text}`) : null
  )
}
