// @ts-check
/**
 * The "works with" strip under the hero.
 *
 * A single row that drifts sideways for ever. The trick is two identical copies
 * of the list inside a track that translates by exactly half its width: at the
 * end of the cycle the second copy sits precisely where the first started, so
 * the loop has no seam and no JavaScript is involved in the animation.
 *
 * The duplicate is aria-hidden, so a screen reader hears the eight names once.
 * The CSS `prefers-reduced-motion` rule in base.css neutralises the animation
 * for anyone who asked the system for stillness, which leaves a static row —
 * still perfectly readable, which is why nothing here depends on the movement.
 */

import { h } from '../lib/dom.js'
import { icon } from '../icons.js'
import { COMPATIBLE_TOOLS } from '../data/compatibility.js'

/**
 * @param {boolean} duplicate
 * @returns {HTMLElement}
 */
function lane(duplicate) {
  return h(
    'ul',
    { class: 'compat__lane', 'aria-hidden': duplicate ? 'true' : null },
    ...COMPATIBLE_TOOLS.map((tool) =>
      h(
        'li',
        { class: 'compat__item' },
        icon(/** @type {any} */ (tool.icon), { size: 17 }),
        h('span', { class: 'compat__name' }, tool.name)
      )
    )
  )
}

/** @returns {HTMLElement} */
export function compatStrip() {
  return h(
    'section',
    { class: 'compat', 'aria-label': 'Ferramentas compatíveis' },
    h('p', { class: 'compat__title' }, 'Integre com sua ferramenta favorita'),
    h(
      'div',
      { class: 'compat__viewport' },
      h('div', { class: 'compat__track' }, lane(false), lane(true))
    )
  )
}
