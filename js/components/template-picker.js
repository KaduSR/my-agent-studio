// @ts-check
/**
 * The template grid, shared by the home page and the empty library.
 *
 * It shows a curated handful and hands the rest to the gallery. Thirty cards on
 * the landing page would bury the calls to action above them, and a page that
 * scrolls for a minute reads as a catalogue rather than as a start.
 */

import { h } from '../lib/dom.js'
import { icon } from '../icons.js'
import { TEMPLATES } from '../data/templates.js'
import { templateCard } from './template-card.js'
import { openTemplateGallery } from '../ui/template-gallery.js'

/** How many templates the inline grid shows before deferring to the gallery. */
export const GRID_LIMIT = 6

/**
 * @param {Object} [options]
 * @param {string} [options.title]
 * @param {string} [options.description]
 * @param {number} [options.limit] How many cards to show inline.
 * @returns {HTMLElement}
 */
export function templateGrid(options = {}) {
  const limit = options.limit ?? GRID_LIMIT
  const shown = TEMPLATES.slice(0, limit)
  const hidden = TEMPLATES.length - shown.length

  return h(
    'section',
    { class: 'templates' },
    options.title
      ? h(
          'div',
          { class: 'templates__header' },
          h('h2', { class: 'section-title' }, options.title),
          options.description
            ? h('p', { class: 'templates__description helper' }, options.description)
            : null
        )
      : null,
    h('ul', { class: 'template-grid' }, ...shown.map((template) => templateCard(template))),
    hidden > 0
      ? h(
          'div',
          { class: 'templates__more' },
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn-secondary',
              onclick: () => openTemplateGallery(),
            },
            icon('layers', { size: 15 }),
            'Ver todos os modelos'
          ),
          h(
            'p',
            { class: 'helper' },
            `Mais ${hidden} ${hidden === 1 ? 'modelo' : 'modelos'} na galeria.`
          )
        )
      : null
  )
}
