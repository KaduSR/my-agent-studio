// @ts-check
/**
 * "Criar novo agente": the three ways in.
 *
 * Before this, the button went straight to a blank builder, and the templates
 * were something you had to notice further down the page. Asking once, at the
 * moment of intent, is what makes "start from a model" a real option rather
 * than a section people scroll past.
 *
 * The third way is a file: an agent exported as JSON from any browser. It is
 * handed to the builder through the pending-agent seam instead of being written
 * into the library, so an import behaves exactly like any other new agent —
 * draft first, promoted once it has a name.
 *
 * Built on <dialog> like the rest of the app's modals, so the focus trap,
 * Escape and ::backdrop come from the platform.
 */

import { h, on } from '../lib/dom.js'
import { icon } from '../icons.js'
import { currentRoute, navigate, reloadRoute } from '../router.js'
import { parseAgentJson } from '../agent/transfer.js'
import { setPendingAgent } from '../stores/pending-agent.js'
import { openTemplateGallery } from './template-gallery.js'
import { showToast } from './toast.js'
import { logger } from '../lib/logger.js'
import { trackEvent } from '../lib/analytics.js'

/**
 * @typedef {Object} Choice
 * @property {string} iconName
 * @property {string} label
 * @property {string} description
 * @property {() => void} onPick
 */

let open = false

/** @returns {void} */
export function openNewAgentDialog() {
  if (open) return
  open = true

  const fileInput = h('input', {
    type: 'file',
    accept: 'application/json,.json',
    hidden: true,
  })

  const dialog = h('dialog', { class: 'dialog dialog--choices', 'aria-labelledby': 'new-agent-title' })

  const close = () => {
    open = false
    dialog.close()
  }

  /** @returns {Promise<void>} */
  async function importFile() {
    const file = fileInput.files?.[0]
    if (!file) return

    try {
      const agent = parseAgentJson(await file.text())
      setPendingAgent(agent)
      trackEvent('agent_created', { source: 'import' })
      close()

      // The address may already be the right one, in which case assigning the
      // hash would do nothing and the import would vanish silently.
      if (currentRoute().name === 'new') reloadRoute()
      else navigate('/studio/new')

      showToast({
        message: agent.name ? `${agent.name} importado.` : 'Agente importado.',
        variant: 'success',
      })
    } catch (error) {
      logger.warn('Agent import failed', error)
      showToast({
        message: error instanceof Error ? error.message : 'Não foi possível ler o arquivo.',
        variant: 'error',
      })
      // Let the same file be picked again after a failure.
      fileInput.value = ''
    }
  }

  on(fileInput, 'change', () => {
    void importFile()
  })

  /** @type {Choice[]} */
  const choices = [
    {
      iconName: 'pencil',
      label: 'Começar do zero',
      description: 'Nove etapas em branco, do nome ao export. Você decide tudo.',
      onPick: () => {
        close()
        navigate('/studio/new')
      },
    },
    {
      iconName: 'sparkles',
      label: 'Usar um modelo',
      description: 'Agentes completos, com objetivo, personalidade, regras e ferramentas já definidos.',
      onPick: () => {
        close()
        openTemplateGallery()
      },
    },
    {
      iconName: 'hard-drive',
      label: 'Importar JSON',
      description: 'Retome um agente exportado daqui, de outro navegador ou de um colega.',
      onPick: () => fileInput.click(),
    },
  ]

  const list = h(
    'div',
    { class: 'choice-list' },
    ...choices.map((choice) =>
      h(
        'button',
        {
          type: 'button',
          class: 'choice-card',
          onclick: choice.onPick,
        },
        h('span', { class: 'choice-card__icon' }, icon(/** @type {any} */ (choice.iconName), { size: 18 })),
        h(
          'span',
          { class: 'choice-card__text' },
          h('span', { class: 'choice-card__label' }, choice.label),
          h('span', { class: 'choice-card__description' }, choice.description)
        ),
        h('span', { class: 'choice-card__go', 'aria-hidden': 'true' }, icon('arrow-right', { size: 15 }))
      )
    )
  )

  const cancel = h(
    'button',
    { type: 'button', class: 'btn btn-secondary', onclick: () => close() },
    'Cancelar'
  )

  dialog.append(
    h(
      'div',
      { class: 'dialog__body' },
      h('h2', { class: 'dialog__title section-title', id: 'new-agent-title' }, 'Como você quer começar?'),
      h(
        'p',
        { class: 'dialog__description' },
        'Tudo é editável depois, seja qual for o caminho.'
      ),
      list
    ),
    h('div', { class: 'dialog__actions' }, cancel),
    fileInput
  )

  dialog.addEventListener('close', () => {
    open = false
    dialog.remove()
  })

  on(dialog, 'click', (event) => {
    if (event.target === dialog) close()
  })

  document.body.appendChild(dialog)
  dialog.showModal()

  const firstChoice = /** @type {HTMLElement | null} */ (list.firstElementChild)
  firstChoice?.focus()
}
