// @ts-check
/**
 * Writing or editing a knowledge document.
 *
 * The same dialog does both, because editing a catalogue document is the expected
 * next move after adding one — the entries are starting points, not a
 * subscription. `doc` absent means "new".
 *
 * Markdown gets a live preview beside the editor rather than a formatted render:
 * renderMarkdown() colours the source, which is the same thing the side panel
 * shows and the only honest option here — SPEC 67 forbids running user content
 * through the HTML parser, so there is no formatter to reuse.
 *
 * Promise-based like customToolDialog, so the caller reads as a single await.
 */

import { h, on, setChildren } from '../lib/dom.js'
import { icon } from '../icons.js'
import { rafSchedule } from '../lib/debounce.js'
import { LIMITS } from '../agent/validate.js'
import { renderMarkdown } from '../components/markdown-view.js'
import { textField } from './field.js'

/**
 * @typedef {Object} KnowledgeDialogResult
 * @property {string} title
 * @property {string} content
 */

const PLACEHOLDER = `# Guia de tom de voz

## Sempre

- Frases curtas.
- Voz ativa.

## Nunca

- Jargão interno com cliente.`

/**
 * @param {import('../agent/types.js').AgentKnowledge} [doc] The document being
 *   edited. Omit to write a new one.
 * @returns {Promise<KnowledgeDialogResult | null>} null when cancelled.
 */
export function knowledgeDialog(doc) {
  return new Promise((resolve) => {
    let settled = false
    const editing = doc !== undefined

    /** @param {KnowledgeDialogResult | null} result */
    const settle = (result) => {
      if (settled) return
      settled = true
      resolve(result)
      dialog.close()
    }

    const error = h('p', { class: 'helper helper-error', hidden: true }, '')

    /** @param {string} message */
    const fail = (message) => {
      error.textContent = message
      error.hidden = false
    }

    const title = textField({
      label: 'Título',
      value: doc?.title ?? '',
      placeholder: 'Guia de tom de voz',
      helper: 'Como o agente vai se referir a este documento.',
      maxLength: LIMITS.knowledgeTitleMax,
      validateAs: 'knowledgeTitle',
      onInput: (value) => {
        if (value.trim()) error.hidden = true
      },
    })

    const preview = h('div', { class: 'knowledge-editor__preview md-view' })

    const paint = rafSchedule(() => {
      const value = content.input.value
      setChildren(
        preview,
        value.length > 0
          ? renderMarkdown(value)
          : h('p', { class: 'knowledge-editor__empty helper' }, 'A prévia aparece aqui.')
      )
    })

    const content = textField({
      label: 'Conteúdo',
      value: doc?.content ?? '',
      placeholder: PLACEHOLDER,
      helper: 'Markdown. Títulos e listas ajudam o agente a citar o trecho certo.',
      maxLength: LIMITS.knowledgeContentMax,
      multiline: true,
      rows: 16,
      validateAs: 'knowledgeContent',
      onInput: (value) => {
        if (value.trim()) error.hidden = true
        paint()
      },
    })

    paint()

    const submit = () => {
      const label = title.input.value.trim()
      if (!label) {
        fail('Dê um título ao documento.')
        title.input.focus()
        return
      }
      const body = content.input.value.trim()
      if (!body) {
        fail('Escreva o conteúdo do documento.')
        content.input.focus()
        return
      }
      settle({ title: label, content: body })
    }

    // Enter submits from the title, as a real form would. It deliberately does
    // not from the textarea, where Enter is a line break.
    on(title.input, 'keydown', (event) => {
      if (/** @type {KeyboardEvent} */ (event).key !== 'Enter') return
      event.preventDefault()
      submit()
    })

    const dialog = h(
      'dialog',
      { class: 'dialog dialog--wide', 'aria-labelledby': 'knowledge-dialog-title' },
      h(
        'div',
        { class: 'dialog__body' },
        h(
          'h2',
          { class: 'dialog__title section-title', id: 'knowledge-dialog-title' },
          editing ? 'Editar documento' : 'Escrever documento'
        ),
        h(
          'p',
          { class: 'dialog__description' },
          'Boas práticas, guia de estilo, política interna: o que o agente deve consultar antes de responder.'
        ),
        h(
          'div',
          { class: 'knowledge-editor' },
          h('div', { class: 'knowledge-editor__form' }, title.element, error, content.element),
          h(
            'div',
            { class: 'knowledge-editor__pane' },
            h('span', { class: 'field-label' }, 'Prévia'),
            preview
          )
        )
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
          icon(editing ? 'check' : 'plus', { size: 15 }),
          editing ? 'Salvar' : 'Adicionar'
        )
      )
    )

    // Covers Escape and any other native close path.
    dialog.addEventListener('close', () => {
      paint.cancel()
      settle(null)
      dialog.remove()
    })

    on(dialog, 'click', (event) => {
      if (event.target === dialog) settle(null)
    })

    document.body.appendChild(dialog)
    dialog.showModal()
    title.input.focus()
  })
}
