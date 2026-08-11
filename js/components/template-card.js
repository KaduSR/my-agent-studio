// @ts-check
/**
 * A single template, as a card.
 *
 * Lives on its own so the inline grid (components/template-picker.js) and the
 * full gallery (ui/template-gallery.js) can both use it without either having
 * to import the other.
 *
 * Each card states what actually comes pre-filled ("3 tons · 6 regras · 2
 * ferramentas") so it reads as a complete agent rather than a label. Cards are
 * real buttons, so Enter and Space work without extra key handling.
 */

import { h } from '../lib/dom.js'
import { icon } from '../icons.js'
import { navigate } from '../router.js'

/**
 * @param {import('../data/templates.js').AgentTemplate} template
 * @returns {string}
 */
export function summarise(template) {
  const { personality, guardRails, tools } = template.agent
  const parts = [
    `${personality.tones.length} ${personality.tones.length === 1 ? 'tom' : 'tons'}`,
    `${guardRails.length} regras`,
    `${tools.length} ${tools.length === 1 ? 'ferramenta' : 'ferramentas'}`,
  ]
  return parts.join(' · ')
}

/**
 * @param {import('../data/templates.js').AgentTemplate} template
 * @param {() => void} [onPick] Runs before navigating, so a dialog can close itself.
 * @returns {HTMLElement}
 */
export function templateCard(template, onPick) {
  return h(
    'li',
    null,
    h(
      'button',
      {
        type: 'button',
        class: 'template-card',
        // The visible text is enough for sighted users; the label spells out
        // that activating this creates an agent.
        'aria-label': `Criar agente a partir do modelo ${template.label}. ${template.tagline}`,
        onclick: () => {
          onPick?.()
          navigate(`/studio/new/${template.id}`)
        },
      },
      h('span', { class: 'template-card__emoji', 'aria-hidden': 'true' }, template.emoji),
      h(
        'span',
        { class: 'template-card__body' },
        h('span', { class: 'template-card__label' }, template.label),
        h('span', { class: 'template-card__tagline' }, template.tagline),
        h('span', { class: 'template-card__meta' }, summarise(template))
      ),
      h('span', { class: 'template-card__go', 'aria-hidden': 'true' }, icon('arrow-right', { size: 15 }))
    )
  )
}
