// @ts-check
/**
 * Step navigation (SPEC 13).
 *
 * Deliberately restrained. It collapses to a rail of icons — each glyph chosen
 * for what its step is actually about — where the label becomes a tooltip on
 * hover or focus. Expanded, the same list shows labels, and only the active
 * step gets the gradient treatment SPEC 13 reserves for it.
 *
 * The rail is the default: it keeps the chrome quiet and hands the width to the
 * builder. The choice is remembered between sessions.
 *
 * On narrow viewports the same markup becomes a horizontally scrolling strip
 * (SPEC 64), handled in CSS, so there is one source of truth for the step list.
 */

import { h, setChildren } from '../lib/dom.js'
import { icon } from '../icons.js'
import { STEPS } from '../data/steps.js'
import { readJSON, writeJSON, STORAGE_KEYS } from '../lib/storage.js'
import { builderStore, setStep } from '../stores/builder-store.js'
import { isStepComplete } from '../agent/progress.js'

/** Minimalist by default. */
const DEFAULT_COLLAPSED = true

/**
 * @param {Object} [options]
 * @param {(collapsed: boolean) => void} [options.onCollapsedChange]
 * @returns {{ element: HTMLElement, destroy: () => void, isCollapsed: () => boolean }}
 */
export function builderSidebar(options = {}) {
  let collapsed = readJSON(STORAGE_KEYS.sidebarCollapsed, DEFAULT_COLLAPSED) === true

  const list = h('ol', { class: 'steps' })

  /*
   * The rail clips horizontally so no scrollbar appears while it animates
   * shut — which would also clip a tooltip anchored inside it. One shared
   * bubble therefore lives on <body> and is positioned against the hovered
   * button, escaping the rail entirely.
   */
  const tip = h('div', { class: 'rail-tip', 'aria-hidden': 'true', hidden: true })
  document.body.appendChild(tip)

  /**
   * @param {HTMLElement} anchor
   * @param {string} label
   * @returns {void}
   */
  function showTip(anchor, label) {
    if (!collapsed) return
    const rect = anchor.getBoundingClientRect()
    tip.textContent = label
    tip.hidden = false
    tip.style.top = `${rect.top + rect.height / 2}px`
    tip.style.left = `${rect.right + 10}px`
  }

  const hideTip = () => {
    tip.hidden = true
  }

  const toggle = h(
    'button',
    {
      type: 'button',
      class: 'sidebar__toggle',
      onclick: () => setCollapsed(!collapsed),
    },
    h('span', { class: 'sidebar__toggle-icon', 'aria-hidden': 'true' }, icon('chevron-right', { size: 15 })),
    h('span', { class: 'sidebar__toggle-label' }, 'Recolher')
  )

  const nav = h(
    'nav',
    { class: 'sidebar', 'aria-label': 'Etapas da criação do agente' },
    list,
    toggle
  )

  const render = () => {
    const { agent, step: activeStep } = builderStore.getState()

    setChildren(
      list,
      ...STEPS.map((step) => {
        const isActive = step.id === activeStep
        const complete = isStepComplete(agent, step.id)
        const state = complete ? 'Etapa preenchida' : 'Etapa ainda não preenchida'

        return h(
          'li',
          { class: 'steps__item' },
          h(
            'button',
            {
              type: 'button',
              class: 'step',
              // The visible label disappears in the rail, so the accessible
              // name is stated outright and stays correct in both states.
              'aria-label': `Etapa ${step.index}: ${step.label}. ${state}`,
              'aria-current': isActive ? 'step' : null,
              dataset: { active: String(isActive), complete: String(complete) },
              onclick: () => setStep(step.id),
              onpointerenter: (/** @type {PointerEvent} */ event) =>
                showTip(/** @type {HTMLElement} */ (event.currentTarget), step.label),
              onpointerleave: hideTip,
              onfocus: (/** @type {FocusEvent} */ event) =>
                showTip(/** @type {HTMLElement} */ (event.currentTarget), step.label),
              onblur: hideTip,
            },
            h(
              'span',
              { class: 'step__dot', 'aria-hidden': 'true' },
              icon(/** @type {any} */ (step.icon), { size: 17 })
            ),
            h(
              'span',
              { class: 'step__body', 'aria-hidden': 'true' },
              h(
                'span',
                { class: 'step__label' },
                h('span', { class: 'step__index' }, String(step.index)),
                step.label
              ),
              isActive ? h('span', { class: 'step__hint' }, step.hint) : null
            ),
            // Purely visual: the accessible name above already carries this.
            h('span', { class: 'sr-only' }, step.label)
          )
        )
      })
    )
  }

  /**
   * @param {boolean} next
   * @param {boolean} [persist]
   * @param {boolean} [notify]
   * @returns {void}
   */
  function setCollapsed(next, persist = true, notify = true) {
    collapsed = next
    nav.dataset.collapsed = String(collapsed)
    hideTip()
    toggle.setAttribute('aria-expanded', String(!collapsed))
    toggle.setAttribute('aria-label', collapsed ? 'Expandir menu de etapas' : 'Recolher menu de etapas')
    toggle.title = collapsed ? 'Expandir menu' : 'Recolher menu'

    if (persist) writeJSON(STORAGE_KEYS.sidebarCollapsed, collapsed)
    if (notify) options.onCollapsedChange?.(collapsed)
  }

  setCollapsed(collapsed, false, false)
  render()

  // Re-render when the step changes, or when a step's completion flips.
  const unsubscribe = builderStore.select(
    (state) => ({
      step: state.step,
      signature: STEPS.map((step) => (isStepComplete(state.agent, step.id) ? '1' : '0')).join(''),
    }),
    render
  )

  return {
    element: nav,
    isCollapsed: () => collapsed,
    destroy: () => {
      unsubscribe()
      tip.remove()
    },
  }
}
