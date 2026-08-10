// @ts-check
/**
 * Shared chrome for every builder step: the title block and the
 * previous/next footer (SPEC 62).
 */

import { h, on } from '../lib/dom.js'
import { icon } from '../icons.js'
import { slugify } from '../lib/uuid.js'
import { readJSON, writeJSON, STORAGE_KEYS } from '../lib/storage.js'
import { STEP_IDS, getStep } from '../data/steps.js'
import { builderStore, goToNextStep, goToPreviousStep } from '../stores/builder-store.js'
import { infoTooltip } from '../ui/tooltip.js'

/** Matches the section expand transition in builder.css. */
const SECTION_TRANSITION_MS = 260

let sectionCounter = 0

/**
 * Which sections the user has opened, keyed by `step:section`.
 * @returns {Record<string, boolean>}
 */
function readOpenSections() {
  return readJSON(STORAGE_KEYS.openSections, /** @type {Record<string, boolean>} */ ({}))
}

/**
 * @param {string} key
 * @param {boolean} open
 * @returns {void}
 */
function persistOpenSection(key, open) {
  writeJSON(STORAGE_KEYS.openSections, { ...readOpenSections(), [key]: open })
}

/**
 * @typedef {Object} StepView
 * @property {HTMLElement} element
 * @property {() => void} [destroy]
 */

/**
 * @param {import('../agent/types.js').StepId} stepId
 * @param {...(Node | null)} sections
 * @returns {HTMLElement}
 */
export function stepShell(stepId, ...sections) {
  const step = getStep(stepId)
  const index = STEP_IDS.indexOf(stepId)
  const isFirst = index === 0
  const isLast = index === STEP_IDS.length - 1

  const nextStep = isLast ? null : getStep(STEP_IDS[index + 1])
  const previousStep = isFirst ? null : getStep(STEP_IDS[index - 1])

  return h(
    'div',
    { class: 'step-view' },
    h(
      'header',
      { class: 'step-view__header' },
      h('p', { class: 'step-view__eyebrow' }, `Etapa ${step.index} de ${STEP_IDS.length}`),
      h(
        'h1',
        { class: 'page-title' },
        step.title,
        step.tooltip ? infoTooltip(step.tooltip, `Sobre ${step.label}`) : null
      ),
      h('p', { class: 'step-view__subtitle' }, step.subtitle)
    ),
    h('div', { class: 'step-view__sections' }, ...sections),
    h(
      'footer',
      { class: 'step-view__footer' },
      previousStep
        ? h(
            'button',
            { type: 'button', class: 'btn btn-ghost', onclick: goToPreviousStep },
            icon('arrow-left', { size: 15 }),
            previousStep.label
          )
        : h('span'),
      nextStep
        ? h(
            'button',
            { type: 'button', class: 'btn btn-primary', onclick: goToNextStep },
            nextStep.label,
            icon('arrow-right', { size: 15 })
          )
        : null
    )
  )
}

/**
 * A collapsible titled block inside a step.
 *
 * Sections open by default — the step reads as a working surface, not a menu —
 * and each one remembers whether the user has since closed it. The header is a
 * real button carrying aria-expanded, so screen readers announce both the
 * section name and its state.
 *
 * @param {Object} config
 * @param {string} config.title
 * @param {string} config.emoji Leading glyph; decorative, hidden from AT.
 * @param {string} [config.description]
 * @param {string} [config.tooltip]
 * @param {Node | null} [config.aside] Stays visible while collapsed (counters).
 * @param {boolean} [config.defaultOpen]
 * @param {...(Node | null)} children
 * @returns {HTMLElement}
 */
export function section(config, ...children) {
  const panelId = `section-panel-${(sectionCounter += 1)}`
  const key = `${builderStore.getState().step}:${slugify(config.title, 'secao')}`
  const stored = readOpenSections()[key]
  let open = typeof stored === 'boolean' ? stored : (config.defaultOpen ?? true)

  /** @type {ReturnType<typeof setTimeout> | null} */
  let settleTimer = null

  const toggle = h(
    'button',
    {
      type: 'button',
      class: 'section__toggle',
      'aria-expanded': String(open),
      'aria-controls': panelId,
    },
    h('span', { class: 'section__emoji', 'aria-hidden': 'true' }, config.emoji),
    h('span', { class: 'section-title' }, config.title),
    h('span', { class: 'section__chevron', 'aria-hidden': 'true' }, icon('chevron-down', { size: 16 }))
  )

  const content = h(
    'div',
    { class: 'section__content' },
    config.description ? h('p', { class: 'section__description helper' }, config.description) : null,
    ...children
  )

  const panel = h('div', { class: 'section__panel', id: panelId }, content)

  const element = h(
    'section',
    { class: 'section', dataset: { open: String(open) } },
    h(
      'div',
      { class: 'section__header' },
      toggle,
      h(
        'div',
        { class: 'section__aside' },
        config.tooltip ? infoTooltip(config.tooltip, `Sobre ${config.title}`) : null,
        config.aside ?? null
      )
    ),
    panel
  )

  const apply = () => {
    element.dataset.open = String(open)
    toggle.setAttribute('aria-expanded', String(open))

    if (settleTimer !== null) clearTimeout(settleTimer)
    if (open) {
      /*
       * The panel clips its content while animating open. Overflow is only
       * released once the transition finishes, otherwise a tooltip anchored
       * near the top edge would be cut off mid-animation.
       */
      settleTimer = setTimeout(() => {
        element.dataset.settled = 'true'
      }, SECTION_TRANSITION_MS)
    } else {
      delete element.dataset.settled
    }
  }

  // Collapsed content is hidden with `visibility`, not `display`/`hidden`:
  // it still leaves the tab order and the accessibility tree, but the height
  // transition survives.
  apply()

  on(toggle, 'click', () => {
    open = !open
    apply()
    persistOpenSection(key, open)
  })

  return element
}

/**
 * Empty state with a call to action (SPEC 59).
 * @param {Object} config
 * @param {string} config.title
 * @param {string} config.description
 * @param {string} [config.actionLabel]
 * @param {() => void} [config.onAction]
 * @param {string} [config.iconName]
 * @returns {HTMLElement}
 */
export function emptyState(config) {
  return h(
    'div',
    { class: 'empty-state' },
    config.iconName
      ? h('span', { class: 'empty-state__icon' }, icon(/** @type {any} */ (config.iconName), { size: 22 }))
      : null,
    h('p', { class: 'empty-state__title' }, config.title),
    h('p', { class: 'empty-state__description helper' }, config.description),
    config.actionLabel && config.onAction
      ? h(
          'button',
          { type: 'button', class: 'btn btn-secondary btn-sm', onclick: config.onAction },
          config.actionLabel
        )
      : null
  )
}

/**
 * Re-render a container whenever a slice of builder state changes.
 *
 * Rebuilding destroys whichever element had focus, which would strand a
 * keyboard user after a single selection — press Space on a tone card and the
 * card you were on ceases to exist. Any child carrying `data-focus-key` is
 * therefore re-focused after the rebuild, so focus survives the round trip.
 *
 * @template T
 * @param {(state: import('../stores/builder-store.js').BuilderState) => T} selector
 * @param {(container: HTMLElement) => void} render
 * @returns {{ element: HTMLElement, destroy: () => void }}
 */
export function reactiveBlock(selector, render) {
  const container = h('div', { class: 'reactive-block' })

  const rerender = () => {
    const active = document.activeElement
    const key =
      active instanceof HTMLElement && container.contains(active)
        ? (active.dataset.focusKey ?? null)
        : null

    render(container)

    if (key === null) return
    for (const candidate of container.querySelectorAll('[data-focus-key]')) {
      if (candidate instanceof HTMLElement && candidate.dataset.focusKey === key) {
        candidate.focus({ preventScroll: true })
        return
      }
    }
  }

  render(container)
  const destroy = builderStore.select(selector, rerender)
  return { element: container, destroy }
}
