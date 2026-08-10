// @ts-check
/**
 * Selectable cards (SPEC 78, 80, 81) — the visual replacement for the dropdowns
 * SPEC 74 rules out.
 *
 * Cards are real <button> elements, so Space and Enter activate them without
 * any extra key handling. Multi-select cards take role="checkbox"; single-select
 * cards take role="radio" inside a radiogroup with roving tabindex and arrow-key
 * navigation, which is the pattern assistive technology expects.
 */

import { h, on } from '../lib/dom.js'
import { icon } from '../icons.js'

/**
 * @typedef {Object} OptionCardConfig
 * @property {string} label
 * @property {string} [description]
 * @property {string} [iconName]
 * @property {'checkbox' | 'radio'} role
 * @property {boolean} selected
 * @property {boolean} [blocked] Selection ceiling reached (SPEC 23, 25).
 * @property {string} [blockedHint] Announced reason when blocked.
 * @property {'grid' | 'row'} [layout]
 * @property {string} [focusKey] Stable id so focus survives a re-render.
 * @property {() => void} onToggle
 */

/**
 * @param {OptionCardConfig} config
 * @returns {HTMLButtonElement}
 */
export function optionCard(config) {
  const layout = config.layout ?? 'grid'
  const blocked = Boolean(config.blocked) && !config.selected

  const card = h(
    'button',
    {
      type: 'button',
      class: `option-card option-card--${layout}`,
      role: config.role,
      'aria-checked': String(config.selected),
      /*
       * A card at the ceiling stays a fully operable checkbox: clicking it
       * explains the limit instead of silently swallowing the click. Marking it
       * aria-disabled would contradict that — assistive technology would
       * announce a control that does, in fact, still respond. The dimmed look
       * comes from data-blocked, and the reason is available as a title.
       */
      dataset: {
        ...(blocked ? { blocked: 'true' } : {}),
        ...(config.focusKey ? { focusKey: config.focusKey } : {}),
      },
      title: blocked ? (config.blockedHint ?? null) : null,
      onclick: config.onToggle,
    },
    config.iconName
      ? h('span', { class: 'option-card__icon' }, icon(/** @type {any} */ (config.iconName), { size: 20 }))
      : null,
    h(
      'span',
      { class: 'option-card__text' },
      h('span', { class: 'option-card__label' }, config.label),
      config.description
        ? h('span', { class: 'option-card__description' }, config.description)
        : null
    ),
    h('span', { class: 'option-card__check', 'aria-hidden': 'true' }, icon('check', { size: 14 }))
  )

  return card
}

/**
 * Wire arrow-key navigation across a set of role="radio" cards.
 * @param {HTMLElement} group
 * @returns {void}
 */
export function wireRadioGroup(group) {
  group.setAttribute('role', 'radiogroup')

  /** @returns {HTMLButtonElement[]} */
  const items = () => Array.from(group.querySelectorAll('[role="radio"]'))

  const syncTabIndex = () => {
    const all = items()
    const checkedIndex = all.findIndex((item) => item.getAttribute('aria-checked') === 'true')
    all.forEach((item, index) => {
      item.tabIndex = index === (checkedIndex === -1 ? 0 : checkedIndex) ? 0 : -1
    })
  }

  syncTabIndex()

  on(group, 'keydown', (event) => {
    const key = /** @type {KeyboardEvent} */ (event).key
    const delta =
      key === 'ArrowRight' || key === 'ArrowDown'
        ? 1
        : key === 'ArrowLeft' || key === 'ArrowUp'
          ? -1
          : 0
    if (delta === 0) return

    const all = items()
    const active = document.activeElement
    const index = all.findIndex((item) => item === active)
    if (index === -1) return

    event.preventDefault()
    const next = all[(index + delta + all.length) % all.length]
    next.focus()
    next.click()
  })

  // Keep the tab stop on the selected card as the selection moves.
  on(group, 'click', () => requestAnimationFrame(syncTabIndex))
}

/**
 * A compact multi-select chip (SPEC 25, 78).
 * @param {{ label: string, selected: boolean, blocked?: boolean, blockedHint?: string, title?: string, focusKey?: string, onToggle: () => void }} config
 * @returns {HTMLButtonElement}
 */
export function traitChip(config) {
  const blocked = Boolean(config.blocked) && !config.selected

  return h(
    'button',
    {
      type: 'button',
      class: 'chip',
      role: 'checkbox',
      'aria-checked': String(config.selected),
      dataset: {
        ...(blocked ? { blocked: 'true' } : {}),
        ...(config.focusKey ? { focusKey: config.focusKey } : {}),
      },
      title: blocked ? (config.blockedHint ?? null) : (config.title ?? null),
      onclick: config.onToggle,
    },
    config.selected
      ? h('span', { class: 'chip__check', 'aria-hidden': 'true' }, icon('check', { size: 13 }))
      : null,
    h('span', null, config.label)
  )
}
