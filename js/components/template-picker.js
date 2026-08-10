// @ts-check
/**
 * The template grid, shared by the home page and the empty library.
 *
 * Each card states what actually comes pre-filled ("3 tons · 6 regras · 2
 * ferramentas") so it reads as a complete agent rather than a label. Cards are
 * real buttons, so Enter and Space work without extra key handling.
 */

import { h } from '../lib/dom.js'
import { icon } from '../icons.js'
import { TEMPLATES } from '../data/templates.js'
import { navigate } from '../router.js'

/**
 * @param {import('../data/templates.js').AgentTemplate} template
 * @returns {string}
 */
function summarise(template) {
  const { personality, hardRules, tools } = template.agent
  const parts = [
    `${personality.tones.length} ${personality.tones.length === 1 ? 'tom' : 'tons'}`,
    `${hardRules.length} regras`,
    `${tools.length} ${tools.length === 1 ? 'ferramenta' : 'ferramentas'}`,
  ]
  return parts.join(' · ')
}

/**
 * @param {Object} [options]
 * @param {string} [options.title]
 * @param {string} [options.description]
 * @returns {HTMLElement}
 */
export function templateGrid(options = {}) {
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
    h(
      'ul',
      { class: 'template-grid' },
      ...TEMPLATES.map((template) =>
        h(
          'li',
          null,
          h(
            'button',
            {
              type: 'button',
              class: 'template-card',
              // The visible text is enough for sighted users; the label spells
              // out that activating this creates an agent.
              'aria-label': `Criar agente a partir do modelo ${template.label}. ${template.tagline}`,
              onclick: () => navigate(`/studio/new/${template.id}`),
            },
            h('span', { class: 'template-card__emoji', 'aria-hidden': 'true' }, template.emoji),
            h(
              'span',
              { class: 'template-card__body' },
              h('span', { class: 'template-card__label' }, template.label),
              h('span', { class: 'template-card__tagline' }, template.tagline),
              h('span', { class: 'template-card__meta' }, summarise(template))
            ),
            h(
              'span',
              { class: 'template-card__go', 'aria-hidden': 'true' },
              icon('arrow-right', { size: 15 })
            )
          )
        )
      )
    )
  )
}
