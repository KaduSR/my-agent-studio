// @ts-check
/**
 * The "how it works" keynote (Pinocchio).
 *
 * Built on <dialog> like the rest of the app's modals, so the focus trap,
 * Escape and ::backdrop come from the platform. Navigation is manual by
 * design — arrows, click, swipe — because an autoplaying deck races anyone
 * reading at their own pace, screen reader or not.
 *
 * The morph is FLIP (see ui/flip.js): the puppet's box is measured before the
 * slide swaps and the new figure is animated from that inverted position, so it
 * flies and resizes into the next composition instead of cross-fading.
 */

import { h, on, setChildren } from '../lib/dom.js'
import { icon } from '../icons.js'
import { KEYNOTE } from '../data/keynote.js'
import { puppet } from './puppet.js'
import { playEnter, playFlip, snapshot } from './flip.js'
import { navigate } from '../router.js'
import { trackEvent } from '../lib/analytics.js'

/** Distance in px a horizontal drag must cover to count as a swipe. */
const SWIPE_THRESHOLD = 48

/**
 * Compositions alternate so consecutive slides never place the figure in the
 * same spot — without that movement there would be nothing for FLIP to morph.
 * @param {number} index
 * @returns {'center' | 'left' | 'right'}
 */
function layoutFor(index) {
  if (index === 0 || index === KEYNOTE.length - 1) return 'center'
  return index % 2 === 0 ? 'right' : 'left'
}

let open = false

/** @returns {void} */
export function openKeynote() {
  if (open) return
  open = true

  let index = 0

  const art = h('div', { class: 'keynote__art' })
  const copy = h('div', { class: 'keynote__copy' })
  const stage = h('div', { class: 'keynote__stage' }, art, copy)

  const counter = h('span', { class: 'keynote__counter' })
  const liveCounter = h('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' })
  const dots = h('div', { class: 'keynote__dots', 'aria-hidden': 'true' })

  const prev = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-secondary btn-sm',
      'aria-label': 'Slide anterior',
      onclick: () => go(index - 1),
    },
    icon('chevron-left', { size: 15 }),
    'Voltar'
  )

  const next = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-primary btn-sm',
      'aria-label': 'Próximo slide',
      onclick: () => go(index + 1),
    },
    'Avançar',
    icon('chevron-right', { size: 15 })
  )

  const dialog = h(
    'dialog',
    { class: 'keynote', 'aria-label': 'Como funciona o My Agent Studio' },
    h(
      'button',
      {
        type: 'button',
        class: 'keynote__close',
        'aria-label': 'Fechar',
        onclick: () => close(),
      },
      icon('x', { size: 16 })
    ),
    stage,
    h(
      'footer',
      { class: 'keynote__nav' },
      prev,
      h('div', { class: 'keynote__progress' }, dots, counter),
      next
    ),
    liveCounter
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
    const clamped = Math.max(0, Math.min(KEYNOTE.length - 1, target))
    if (clamped === index) return
    render(clamped, true)
  }

  /**
   * @param {number} nextIndex
   * @param {boolean} animate
   * @returns {void}
   */
  function render(nextIndex, animate) {
    // FIRST: measure the figure that is on screen right now.
    const existing = art.querySelector('svg')
    const first = animate && existing ? snapshot(existing) : null

    index = nextIndex
    const slide = KEYNOTE[index]
    const layout = layoutFor(index)
    stage.dataset.layout = layout

    // LAST: swap in the new figure.
    // Centred slides stack the figure above the copy, so it has to be smaller
    // to leave room — the closing slide also carries two call-to-action buttons.
    const figure = puppet(slide.stage, layout === 'center' ? 168 : 210)
    setChildren(art, figure)

    // INVERT & PLAY.
    if (first) playFlip(figure, first)

    const title = h('h2', { class: 'keynote__title', tabindex: '-1' }, slide.title)

    setChildren(
      copy,
      slide.eyebrow ? h('p', { class: 'keynote__eyebrow' }, slide.eyebrow) : null,
      title,
      h('p', { class: 'keynote__story' }, slide.story),
      h('p', { class: 'keynote__lesson' }, slide.lesson),
      index === KEYNOTE.length - 1
        ? h(
            'div',
            { class: 'keynote__cta' },
            h(
              'button',
              {
                type: 'button',
                class: 'btn btn-primary',
                onclick: () => {
                  close()
                  navigate('/studio/new')
                },
              },
              icon('plus', { size: 15 }),
              'Criar meu agente'
            ),
            h(
              'button',
              {
                type: 'button',
                class: 'btn btn-secondary',
                onclick: () => {
                  close()
                  navigate('/')
                },
              },
              icon('sparkles', { size: 15 }),
              'Ver os modelos'
            )
          )
        : null
    )

    if (animate) {
      playEnter(copy, { delay: 90 })
    }

    // Progress.
    setChildren(
      dots,
      ...KEYNOTE.map((_, i) =>
        h('span', { class: 'keynote__dot', dataset: { active: String(i === index) } })
      )
    )
    counter.textContent = `${index + 1} / ${KEYNOTE.length}`
    liveCounter.textContent = `Slide ${index + 1} de ${KEYNOTE.length}: ${slide.title}`

    prev.disabled = index === 0
    next.disabled = index === KEYNOTE.length - 1

    // Move focus to the new heading so the slide is announced, without
    // scrolling the dialog around.
    if (animate) title.focus({ preventScroll: true })
  }

  /* ------------------------------- input -------------------------------- */

  on(dialog, 'keydown', (event) => {
    const key = /** @type {KeyboardEvent} */ (event).key
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
      go(KEYNOTE.length - 1)
    }
  })

  // Clicking the stage advances; clicking the backdrop closes.
  on(stage, 'click', () => go(index + 1))
  on(dialog, 'click', (event) => {
    if (event.target === dialog) close()
  })

  let swipeStart = 0
  on(stage, 'pointerdown', (event) => {
    swipeStart = /** @type {PointerEvent} */ (event).clientX
  })
  on(stage, 'pointerup', (event) => {
    const delta = /** @type {PointerEvent} */ (event).clientX - swipeStart
    if (Math.abs(delta) < SWIPE_THRESHOLD) return
    go(delta < 0 ? index + 1 : index - 1)
  })

  dialog.addEventListener('close', () => {
    open = false
    dialog.remove()
  })

  document.body.appendChild(dialog)
  render(0, false)
  dialog.showModal()
  next.focus()

  trackEvent('step_viewed', { keynote: 'opened' })
}
