// @ts-check
/**
 * Toasts (SPEC 82) — including the undo affordance for rule deletion (SPEC 58).
 *
 * The host element carries aria-live="polite" so messages are announced without
 * stealing focus. A toast with an action stays on screen longer, because the
 * user has to be able to reach it before it disappears.
 */

import { h, on } from '../lib/dom.js'
import { icon } from '../icons.js'

const DEFAULT_DURATION = 4000
const ACTION_DURATION = 8000

/** @returns {HTMLElement} */
function getRegion() {
  const region = document.getElementById('toast-region')
  if (!region) throw new Error('Toast region is missing from the document')
  return region
}

/**
 * @typedef {Object} ToastOptions
 * @property {string} message
 * @property {'info' | 'success' | 'error'} [variant]
 * @property {{ label: string, onAction: () => void }} [action]
 * @property {number} [duration] Milliseconds. Pass 0 to require manual dismissal.
 */

/**
 * @param {ToastOptions} options
 * @returns {() => void} Dismiss the toast early.
 */
export function showToast(options) {
  const variant = options.variant ?? 'info'
  const duration =
    options.duration ?? (options.action ? ACTION_DURATION : DEFAULT_DURATION)

  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null

  const dismiss = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
    toast.dataset.leaving = 'true'
    setTimeout(() => toast.remove(), 160)
  }

  const glyph = variant === 'success' ? 'check' : variant === 'error' ? 'alert-circle' : 'info'

  const toast = h(
    'div',
    { class: `toast toast--${variant}` },
    h('span', { class: 'toast__icon' }, icon(glyph, { size: 16 })),
    h('span', { class: 'toast__message' }, options.message),
    options.action
      ? h(
          'button',
          {
            type: 'button',
            class: 'toast__action',
            onclick: () => {
              options.action?.onAction()
              dismiss()
            },
          },
          options.action.label
        )
      : null,
    h(
      'button',
      {
        type: 'button',
        class: 'toast__close',
        'aria-label': 'Fechar aviso',
        onclick: dismiss,
      },
      icon('x', { size: 14 })
    )
  )

  getRegion().appendChild(toast)

  if (duration > 0) timer = setTimeout(dismiss, duration)

  // Pause the countdown while the pointer rests on the toast.
  on(toast, 'pointerenter', () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
  })
  on(toast, 'pointerleave', () => {
    if (duration > 0 && timer === null) timer = setTimeout(dismiss, duration)
  })

  return dismiss
}

/**
 * Assigning an identical string is not a mutation, so a repeated announcement
 * would never reach the user. Alternating a trailing non-breaking space forces
 * a content change without altering how the message reads aloud. Built with
 * fromCharCode so this source file stays plain ASCII.
 */
const REPEAT_MARKER = String.fromCharCode(0xa0)

/**
 * Announce a message to assistive technology without showing a toast — used by
 * keyboard drag-and-drop (SPEC 65).
 * @param {string} message
 * @returns {void}
 */
export function announce(message) {
  const region = document.getElementById('live-region')
  if (!region) return
  region.textContent = region.textContent === message ? message + REPEAT_MARKER : message
}
