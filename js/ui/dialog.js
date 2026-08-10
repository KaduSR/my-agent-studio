// @ts-check
/**
 * Modal confirmation (SPEC 95).
 *
 * Built on the native <dialog> element, which brings the focus trap, the
 * Escape-to-close behaviour, inert background content and the ::backdrop
 * pseudo-element for free — all things ADR-004's component library would
 * otherwise have supplied.
 */

import { h } from '../lib/dom.js'

/**
 * @typedef {Object} ConfirmOptions
 * @property {string} title
 * @property {string} [description]
 * @property {string} [confirmLabel]
 * @property {string} [cancelLabel]
 * @property {boolean} [danger]
 */

/**
 * @param {ConfirmOptions} options
 * @returns {Promise<boolean>} Resolves true when confirmed.
 */
export function confirmDialog(options) {
  return new Promise((resolve) => {
    let settled = false

    /** @param {boolean} result */
    const settle = (result) => {
      if (settled) return
      settled = true
      resolve(result)
      dialog.close()
    }

    const confirmButton = h(
      'button',
      {
        type: 'button',
        class: `btn ${options.danger ? 'btn-danger' : 'btn-primary'}`,
        onclick: () => settle(true),
      },
      options.confirmLabel ?? 'Confirmar'
    )

    const dialog = h(
      'dialog',
      { class: 'dialog', 'aria-labelledby': 'dialog-title' },
      h(
        'div',
        { class: 'dialog__body' },
        h('h2', { class: 'dialog__title section-title', id: 'dialog-title' }, options.title),
        options.description ? h('p', { class: 'dialog__description' }, options.description) : null
      ),
      h(
        'div',
        { class: 'dialog__actions' },
        h(
          'button',
          { type: 'button', class: 'btn btn-secondary', onclick: () => settle(false) },
          options.cancelLabel ?? 'Cancelar'
        ),
        confirmButton
      )
    )

    // Covers Escape and any other native close path.
    dialog.addEventListener('close', () => {
      settle(false)
      dialog.remove()
    })

    // Clicking the backdrop resolves the dialog as a cancel.
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) settle(false)
    })

    document.body.appendChild(dialog)
    dialog.showModal()
    confirmButton.focus()
  })
}
