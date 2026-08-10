// @ts-check
/**
 * Live Markdown preview (SPEC 34, 63).
 *
 * There is no "generate preview" button by design. The panel subscribes to the
 * agent slice and re-renders on change, coalesced into one animation frame so a
 * burst of keystrokes repaints once.
 *
 * The panel is collapsible and starts collapsed, so the builder gets the full
 * width by default. This departs from SPEC 34's "always visible on desktop" at
 * the product owner's request. Two consequences are handled here: the choice is
 * remembered between sessions, and while collapsed the document is not rendered
 * at all — the work is deferred to the moment it becomes visible.
 */

import { h, setChildren, on } from '../lib/dom.js'
import { icon } from '../icons.js'
import { rafSchedule } from '../lib/debounce.js'
import { readJSON, writeJSON, STORAGE_KEYS } from '../lib/storage.js'
import { builderStore } from '../stores/builder-store.js'
import { generateAgentMarkdown } from '../agent/markdown.js'
import { copyAgentMarkdown } from '../agent/export.js'
import { renderMarkdown } from './markdown-view.js'
import { showToast } from '../ui/toast.js'

/** Collapsed unless the user has said otherwise. */
const DEFAULT_COLLAPSED = true

/**
 * @param {Object} [options]
 * @param {(collapsed: boolean) => void} [options.onCollapsedChange]
 *   Notified so the surrounding layout can resize its columns.
 * @returns {{ element: HTMLElement, destroy: () => void, isCollapsed: () => boolean }}
 */
export function previewPanel(options = {}) {
  let collapsed = readJSON(STORAGE_KEYS.previewCollapsed, DEFAULT_COLLAPSED) === true
  /** True when the body is out of date because it changed while collapsed. */
  let stale = true

  /*
   * Below 1024px the preview is a tab rather than a column (SPEC 64), so the
   * collapse preference does not apply — choosing the Preview tab must show the
   * document. The preference is remembered, just not honoured at this width.
   */
  const narrow = window.matchMedia('(max-width: 1023px)')
  const isEffectivelyCollapsed = () => collapsed && !narrow.matches

  const body = h('div', { class: 'preview__body', id: 'preview-body' })
  const status = h('span', { class: 'save-status', dataset: { status: 'idle' } })

  const copyButton = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-secondary btn-sm',
      onclick: async () => {
        const ok = await copyAgentMarkdown(builderStore.getState().agent)
        showToast({
          message: ok ? 'Markdown copiado.' : 'Não foi possível copiar. Tente baixar o arquivo.',
          variant: ok ? 'success' : 'error',
        })
      },
    },
    icon('copy', { size: 14 }),
    'Copiar'
  )

  const toggle = h(
    'button',
    {
      type: 'button',
      class: 'preview__toggle',
      'aria-controls': 'preview-body',
      onclick: () => setCollapsed(!collapsed),
    },
    icon('panel-right', { size: 16 })
  )

  const railLabel = h('span', { class: 'preview__rail-label', 'aria-hidden': 'true' }, 'AGENT.md')

  const panel = h(
    'aside',
    { class: 'preview', 'aria-label': 'Pré-visualização do agente' },
    h(
      'div',
      { class: 'preview__header' },
      toggle,
      railLabel,
      h(
        'div',
        { class: 'preview__title-group' },
        h('h2', { class: 'preview__title' }, 'AGENT.md'),
        status
      ),
      copyButton
    ),
    body
  )

  const renderMarkdownBody = () => {
    // Nothing to paint while hidden; remember to catch up on expand.
    if (isEffectivelyCollapsed()) {
      stale = true
      return
    }
    stale = false
    setChildren(body, renderMarkdown(generateAgentMarkdown(builderStore.getState().agent)))
  }

  const scheduleRender = rafSchedule(renderMarkdownBody)

  /**
   * @param {boolean} next
   * @param {boolean} [persist]
   * @param {boolean} [notify] The initial call skips this: the caller reads
   *   isCollapsed() directly, and its layout element does not exist yet.
   * @returns {void}
   */
  function setCollapsed(next, persist = true, notify = true) {
    collapsed = next
    applyState()
    if (persist) writeJSON(STORAGE_KEYS.previewCollapsed, collapsed)
    if (notify) options.onCollapsedChange?.(isEffectivelyCollapsed())
  }

  /** Reflect the current (width-aware) state into the DOM. */
  function applyState() {
    const hidden = isEffectivelyCollapsed()
    panel.dataset.collapsed = String(hidden)
    body.hidden = hidden
    toggle.hidden = narrow.matches
    toggle.setAttribute('aria-expanded', String(!hidden))
    toggle.setAttribute(
      'aria-label',
      hidden ? 'Mostrar pré-visualização do Markdown' : 'Ocultar pré-visualização do Markdown'
    )
    toggle.title = hidden ? 'Mostrar preview' : 'Ocultar preview'

    if (!hidden && stale) renderMarkdownBody()
  }

  const renderStatus = () => {
    const { saveStatus, saveError } = builderStore.getState()
    status.dataset.status = saveStatus

    const text =
      saveStatus === 'saving'
        ? 'Salvando...'
        : saveStatus === 'saved'
          ? 'Salvo automaticamente'
          : saveStatus === 'error'
            ? 'Não foi possível salvar'
            : ''

    setChildren(status, text ? h('span', { class: 'save-status__dot', 'aria-hidden': 'true' }) : null, text)
    status.title = saveError ?? ''
  }

  applyState()
  renderStatus()

  // Crossing the breakpoint changes whether the preference applies at all.
  const onWidthChange = () => {
    applyState()
    options.onCollapsedChange?.(isEffectivelyCollapsed())
  }
  narrow.addEventListener('change', onWidthChange)

  const unsubscribeAgent = builderStore.select((state) => state.agent, scheduleRender)
  const unsubscribeStatus = builderStore.select(
    (state) => ({ status: state.saveStatus, error: state.saveError }),
    renderStatus
  )

  // Surface a storage failure loudly the first time it happens (SPEC 98).
  let warned = false
  const unsubscribeError = builderStore.select(
    (state) => state.saveStatus,
    (value) => {
      if (value !== 'error' || warned) return
      warned = true
      showToast({
        message:
          builderStore.getState().saveError ??
          'Não foi possível salvar automaticamente. Exporte seu agente para evitar perder alterações.',
        variant: 'error',
        duration: 0,
      })
    }
  )

  on(panel, 'keydown', (event) => {
    const keyboardEvent = /** @type {KeyboardEvent} */ (event)
    if (keyboardEvent.key.toLowerCase() === 's' && (keyboardEvent.metaKey || keyboardEvent.ctrlKey)) {
      // SPEC 97: work is already saved; acknowledge instead of hijacking silently.
      keyboardEvent.preventDefault()
      showToast({ message: 'Seu agente já é salvo automaticamente.', variant: 'success' })
    }
  })

  return {
    element: panel,
    isCollapsed: () => collapsed,
    destroy: () => {
      scheduleRender.cancel()
      unsubscribeAgent()
      unsubscribeStatus()
      unsubscribeError()
    },
  }
}
