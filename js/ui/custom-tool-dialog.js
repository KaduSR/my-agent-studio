// @ts-check
/**
 * Declaring a tool the catalogue does not have.
 *
 * The catalogue covers the common ground, but the interesting integrations are
 * always the in-house ones: an MCP server the team wrote, a service only this
 * company has. Without this, those agents would export with a hole in the tools
 * section, or with the truth stuffed into a purpose field.
 *
 * Promise-based like confirmDialog, so the caller reads as a single await, and
 * built on ui/field.js so the inputs behave like every other field in the app.
 */

import { h, on } from '../lib/dom.js'
import { icon } from '../icons.js'
import { LIMITS } from '../agent/validate.js'
import { textField } from './field.js'

/**
 * @typedef {Object} CustomToolInput
 * @property {string} name
 * @property {string} description
 */

/**
 * @returns {Promise<CustomToolInput | null>} null when cancelled.
 */
export function customToolDialog() {
  return new Promise((resolve) => {
    let settled = false

    /** @param {CustomToolInput | null} result */
    const settle = (result) => {
      if (settled) return
      settled = true
      resolve(result)
      dialog.close()
    }

    const error = h('p', { class: 'helper helper-error', hidden: true }, 'Dê um nome à ferramenta.')

    const name = textField({
      label: 'Nome',
      value: '',
      placeholder: 'Servidor MCP do time',
      helper: 'Como o time chama essa ferramenta.',
      maxLength: LIMITS.nameMax,
      onInput: (value) => {
        if (value.trim()) error.hidden = true
      },
    })

    const description = textField({
      label: 'O que ela faz',
      value: '',
      placeholder: 'Consulta o catálogo interno de produtos.',
      helper: 'Uma linha, para o agente saber quando recorrer a ela.',
      maxLength: LIMITS.descriptionMax,
      onInput: () => {},
    })

    const submit = () => {
      const label = name.input.value.trim()
      if (!label) {
        error.hidden = false
        name.input.focus()
        return
      }
      settle({ name: label, description: description.input.value.trim() })
    }

    // Enter submits from either field, the way a real form would.
    for (const field of [name.input, description.input]) {
      on(field, 'keydown', (event) => {
        if (/** @type {KeyboardEvent} */ (event).key !== 'Enter') return
        event.preventDefault()
        submit()
      })
    }

    const dialog = h(
      'dialog',
      { class: 'dialog', 'aria-labelledby': 'custom-tool-title' },
      h(
        'div',
        { class: 'dialog__body' },
        h(
          'h2',
          { class: 'dialog__title section-title', id: 'custom-tool-title' },
          'Adicionar ferramenta'
        ),
        h(
          'p',
          { class: 'dialog__description' },
          'Para o que não está no catálogo: um servidor MCP, um serviço interno, uma integração sob medida.'
        ),
        h('div', { class: 'custom-tool-form' }, name.element, error, description.element)
      ),
      h(
        'div',
        { class: 'dialog__actions' },
        h(
          'button',
          { type: 'button', class: 'btn btn-secondary', onclick: () => settle(null) },
          'Cancelar'
        ),
        h(
          'button',
          { type: 'button', class: 'btn btn-primary', onclick: submit },
          icon('plus', { size: 15 }),
          'Adicionar'
        )
      )
    )

    // Covers Escape and any other native close path.
    dialog.addEventListener('close', () => {
      settle(null)
      dialog.remove()
    })

    on(dialog, 'click', (event) => {
      if (event.target === dialog) settle(null)
    })

    document.body.appendChild(dialog)
    dialog.showModal()
    name.input.focus()
  })
}
