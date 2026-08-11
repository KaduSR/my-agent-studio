// @ts-check
/**
 * The beginner's dictionary (the wiki button in the header).
 *
 * Same machinery as the keynote, different shape. The keynote is a story, so it
 * is linear; a dictionary is looked up, so this one leads with a rail of terms
 * anyone can jump around in. What the two share is the figure: the puppet is
 * rebuilt per term and morphed with FLIP, and it keeps breathing while it sits
 * there, so a term is a scene rather than a card.
 *
 * The composition alternates sides between entries. That is not decoration:
 * without a change of position FLIP has nothing to interpolate, and the figure
 * would pop instead of fly.
 */

import { h, on, setChildren } from '../lib/dom.js'
import { icon } from '../icons.js'
import { GLOSSARY } from '../data/glossary.js'
import { puppet, stopPuppet } from './puppet.js'
import { playEnter, playFlip, snapshot } from './flip.js'
import { trackEvent } from '../lib/analytics.js'

let open = false

/** @returns {void} */
export function openGlossary() {
  if (open) return
  open = true

  let index = 0

  const art = h('div', { class: 'wiki__art' })
  const copy = h('div', { class: 'wiki__copy' })
  const entry = h('div', { class: 'wiki__entry' }, art, copy)
  const rail = h('nav', { class: 'wiki__rail', 'aria-label': 'Termos' })
  const live = h('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' })

  const prev = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-secondary btn-sm',
      'aria-label': 'Termo anterior',
      onclick: () => go(index - 1),
    },
    icon('chevron-left', { size: 15 }),
    'Anterior'
  )

  const next = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-secondary btn-sm',
      'aria-label': 'Próximo termo',
      onclick: () => go(index + 1),
    },
    'Próximo',
    icon('chevron-right', { size: 15 })
  )

  const counter = h('span', { class: 'wiki__counter' })

  const dialog = h(
    'dialog',
    { class: 'wiki', 'aria-label': 'Dicionário do agente' },
    h(
      'header',
      { class: 'wiki__header' },
      h(
        'div',
        null,
        h('h2', { class: 'wiki__title section-title' }, 'Dicionário do agente'),
        h(
          'p',
          { class: 'helper' },
          'As palavras que aparecem em toda conversa sobre IA, explicadas com o boneco.'
        )
      ),
      h(
        'button',
        { type: 'button', class: 'wiki__close', 'aria-label': 'Fechar', onclick: () => close() },
        icon('x', { size: 16 })
      )
    ),
    h('div', { class: 'wiki__body' }, rail, entry),
    h('footer', { class: 'wiki__nav' }, prev, counter, next),
    live
  )

  const close = () => {
    open = false
    dialog.close()
  }

  /**
   * @param {number} target
   * @returns {void}
   */
  function go(target) {
    const clamped = Math.max(0, Math.min(GLOSSARY.length - 1, target))
    if (clamped === index) return
    render(clamped, true)
  }

  /**
   * @param {number} nextIndex
   * @param {boolean} animate
   * @returns {void}
   */
  function render(nextIndex, animate) {
    // FIRST: measure the figure where it is now, mid-bob included.
    const existing = art.querySelector('svg')
    const first = animate && existing ? snapshot(existing) : null
    if (existing) stopPuppet(existing)

    index = nextIndex
    const term = GLOSSARY[index]
    entry.dataset.side = index % 2 === 0 ? 'left' : 'right'

    // LAST: swap in the new figure, then INVERT & PLAY.
    const figure = puppet(term.stage, 176)
    setChildren(art, figure)
    if (first) playFlip(figure, first)

    const heading = h('h3', { class: 'wiki__term', tabindex: '-1' }, term.term)

    setChildren(
      copy,
      h('p', { class: 'wiki__eyebrow' }, `Termo ${index + 1} de ${GLOSSARY.length}`),
      heading,
      h('p', { class: 'wiki__plain' }, term.plain),
      h(
        'p',
        { class: 'wiki__story' },
        h('span', { class: 'wiki__tag' }, 'No Pinóquio'),
        term.story
      ),
      h('p', { class: 'wiki__example' }, h('span', { class: 'wiki__tag' }, 'Na prática'), term.example)
    )

    if (animate) playEnter(copy, { delay: 90 })

    setChildren(
      rail,
      ...GLOSSARY.map((candidate, i) =>
        h(
          'button',
          {
            type: 'button',
            class: 'wiki__rail-item',
            'aria-current': i === index ? 'true' : null,
            dataset: { active: String(i === index) },
            onclick: () => go(i),
          },
          candidate.term
        )
      )
    )

    // On a phone the rail is a strip that scrolls sideways, so the term the
    // arrows just moved to has to be brought into view or it reads as inert.
    const activeItem = rail.querySelector('[data-active="true"]')
    if (activeItem) activeItem.scrollIntoView({ block: 'nearest', inline: 'nearest' })

    counter.textContent = `${index + 1} / ${GLOSSARY.length}`
    live.textContent = `${term.term}. ${term.plain}`
    prev.disabled = index === 0
    next.disabled = index === GLOSSARY.length - 1

    // Move focus to the new heading so the term is announced, without dragging
    // the dialog's scroll position around.
    if (animate) heading.focus({ preventScroll: true })
  }

  /* ------------------------------- input -------------------------------- */

  on(dialog, 'keydown', (event) => {
    const key = /** @type {KeyboardEvent} */ (event).key
    // The rail is a list of buttons; arrows there would fight the browser's own
    // focus handling, so navigation keys are only taken when focus is elsewhere.
    const inRail = rail.contains(/** @type {Node} */ (event.target))
    if (inRail) return

    if (key === 'ArrowRight' || key === 'PageDown') {
      event.preventDefault()
      go(index + 1)
    } else if (key === 'ArrowLeft' || key === 'PageUp') {
      event.preventDefault()
      go(index - 1)
    } else if (key === 'Home') {
      event.preventDefault()
      go(0)
    } else if (key === 'End') {
      event.preventDefault()
      go(GLOSSARY.length - 1)
    }
  })

  on(dialog, 'click', (event) => {
    if (event.target === dialog) close()
  })

  dialog.addEventListener('close', () => {
    open = false
    const figure = art.querySelector('svg')
    if (figure) stopPuppet(figure)
    dialog.remove()
  })

  document.body.appendChild(dialog)
  render(0, false)
  dialog.showModal()
  next.focus()

  trackEvent('step_viewed', { glossary: 'opened' })
}
