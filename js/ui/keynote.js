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
 *
 * There are two decks behind the same button now (see data/keynote-tracks.js), so
 * the dialog has two modes. It opens on a menu of tracks, and picking one enters
 * it. The menu is not a detour: the card carries a live puppet, and the morph is
 * measured from *that* figure, so choosing a track looks like lifting the puppet
 * out of the card and setting it on the stage. Going back reverses the same
 * measurement. That is the reason the choice is a screen inside the deck rather
 * than a dropdown on the button that opens it.
 */

import { h, on, setChildren } from '../lib/dom.js'
import { icon } from '../icons.js'
import { KEYNOTE_TRACKS, getTrack } from '../data/keynote-tracks.js'
import { puppet, stopPuppet } from './puppet.js'
import { renderBlocks } from './keynote-blocks.js'
import { playEnter, playFlip, snapshot } from './flip.js'
import { navigate } from '../router.js'
import { trackEvent } from '../lib/analytics.js'

/** Distance in px a horizontal drag must cover to count as a swipe. */
const SWIPE_THRESHOLD = 48

/** Figure size on a menu card. Small enough that two fit side by side. */
const CARD_FIGURE = 128

/**
 * Compositions alternate so consecutive slides never place the figure in the
 * same spot — without that movement there would be nothing for FLIP to morph.
 *
 * The bookends are centred, which stacks the figure above the copy. A slide
 * carrying blocks cannot afford that: the figure and a table in one column is
 * taller than any dialog, so the deck's first and last slides would open
 * scrolled with the puppet cut in half. Those keep a side-by-side composition,
 * and because the alternation is by parity the sequence still never repeats a
 * position.
 *
 * @param {import('../data/keynote.js').KeynoteSlide} slide
 * @param {number} index
 * @param {number} length
 * @returns {'center' | 'left' | 'right'}
 */
function layoutFor(slide, index, length) {
  const isBookend = index === 0 || index === length - 1
  if (isBookend && !slide.blocks?.length) return 'center'
  return index % 2 === 0 ? 'right' : 'left'
}

let open = false

/**
 * @param {string} [trackId] Skip the menu and open this track directly.
 * @returns {void}
 */
export function openKeynote(trackId) {
  if (open) return
  open = true

  /** @type {'menu' | 'track'} */
  let mode = 'menu'
  /** @type {import('../data/keynote-tracks.js').KeynoteTrack | null} */
  let track = null
  let index = 0

  /**
   * The track and copy columns are kept across renders rather than rebuilt,
   * because `art` is where the outgoing figure is measured from and it has to
   * survive a trip through the menu to be measurable on the way back.
   */
  const art = h('div', { class: 'keynote__art' })
  const copy = h('div', { class: 'keynote__copy' })
  /*
   * Blocks get their own column rather than sitting under the lesson. Stacked,
   * a slide with a table or an eight row log was taller than any dialog worth
   * opening, and the deck asks to be read as slides, not scrolled as a page.
   * Empty on the slides that have none, and hidden by CSS so it does not claim
   * a grid column there.
   */
  const side = h('div', { class: 'keynote__side' })
  const stage = h('div', { class: 'keynote__stage' })

  /** @type {HTMLButtonElement[]} */
  let cards = []

  const counter = h('span', { class: 'keynote__counter' })
  const trackLabel = h('span', { class: 'keynote__track-label' })
  const liveCounter = h('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' })
  const dots = h('div', { class: 'keynote__dots', 'aria-hidden': 'true' })

  const toTracks = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-ghost btn-sm',
      'aria-label': 'Voltar para as trilhas',
      onclick: () => showMenu(),
    },
    icon('list-tree', { size: 15 }),
    'Trilhas'
  )

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

  const nav = h('footer', { class: 'keynote__nav' })

  /*
   * The subject's industry name, pinned to the corner of the dialog rather than
   * placed in the copy column. It has to sit in the same spot on every slide, and
   * the copy column moves from left to right as the composition alternates.
   */
  const term = h('p', { class: 'keynote__term' })

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
    term,
    stage,
    nav,
    liveCounter
  )

  const close = () => {
    open = false
    dialog.close()
  }

  /**
   * Every figure the dialog is holding, attached or not.
   *
   * `art` is detached while the menu is up but still owns a figure with live
   * idle loops, so a query rooted only at the stage would leave them running for
   * the life of the dialog. That is the leak stopPuppet exists to prevent.
   *
   * @returns {SVGElement[]}
   */
  function figures() {
    return [
      ...new Set([
        .../** @type {NodeListOf<SVGElement>} */ (stage.querySelectorAll('svg.puppet')),
        .../** @type {NodeListOf<SVGElement>} */ (art.querySelectorAll('svg.puppet')),
      ]),
    ]
  }

  /** @returns {void} */
  function stopFigures() {
    for (const figure of figures()) stopPuppet(figure)
  }

  /* -------------------------------- the menu ------------------------------- */

  /**
   * @param {import('./flip.js').Snapshot | null} [from] Box of the figure to
   *   morph out of, when arriving from inside a track.
   * @param {string | null} [fromTrackId] Which card that figure belongs to.
   * @returns {void}
   */
  function showMenu(from = null, fromTrackId = null) {
    const leaving = from ?? (mode === 'track' ? boxOfCurrentFigure() : null)
    const leavingTrackId = fromTrackId ?? track?.id ?? null

    stopFigures()
    mode = 'menu'
    track = null
    dialog.dataset.dense = 'false'

    const intro = h(
      'div',
      { class: 'keynote__menu-intro' },
      h('p', { class: 'keynote__eyebrow' }, 'Como funciona'),
      h('h2', { class: 'keynote__title', tabindex: '-1' }, 'Duas trilhas'),
      h(
        'p',
        { class: 'keynote__lesson' },
        'A primeira monta um agente com você, passo a passo. A segunda explica o sistema em volta dele. Dá para ver as duas, em qualquer ordem.'
      )
    )

    cards = KEYNOTE_TRACKS.map((candidate) =>
      h(
        'button',
        {
          type: 'button',
          class: 'keynote__track',
          onclick: () => enterTrack(candidate.id),
        },
        h('span', { class: 'keynote__track-art' }, puppet(candidate.stage, CARD_FIGURE)),
        h('span', { class: 'keynote__track-eyebrow' }, candidate.eyebrow),
        h('span', { class: 'keynote__track-title' }, candidate.title),
        h('span', { class: 'keynote__track-desc' }, candidate.description),
        h(
          'span',
          { class: 'keynote__track-meta' },
          icon('presentation', { size: 13 }),
          `${candidate.slides.length} slides`
        )
      )
    )

    const menu = h(
      'div',
      { class: 'keynote__menu' },
      intro,
      h('div', { class: 'keynote__tracks' }, ...cards)
    )

    stage.dataset.layout = 'menu'
    setChildren(stage, menu)
    setChildren(nav, h('p', { class: 'keynote__hint' }, 'Escolha uma trilha para começar'))

    // The menu is a choice between two decks, not a subject, so there is no term
    // to name. Emptying it rather than hiding it keeps the tag out of the
    // accessibility tree here too.
    setChildren(term, null)

    // The figure flies back into the card it came out of.
    const homeIndex = Math.max(
      0,
      KEYNOTE_TRACKS.findIndex((candidate) => candidate.id === leavingTrackId)
    )
    const homeFigure = cards[homeIndex]?.querySelector('svg')
    if (leaving && homeFigure) playFlip(homeFigure, leaving)

    if (leaving) {
      playEnter(intro, { delay: 120 })
      cards.forEach((card, position) => playEnter(card, { delay: 160 + position * 80 }))
    }

    liveCounter.textContent = 'Como funciona. Duas trilhas: escolha uma para começar.'
    cards[leavingTrackId ? homeIndex : 0]?.focus({ preventScroll: true })
  }

  /**
   * @returns {import('./flip.js').Snapshot | null}
   */
  function boxOfCurrentFigure() {
    const existing = art.querySelector('svg')
    return existing ? snapshot(existing) : null
  }

  /**
   * @param {string} id
   * @returns {void}
   */
  function enterTrack(id) {
    const chosen = getTrack(id)
    if (!chosen) return

    // Measured before the cards are torn down, so the morph starts from the
    // figure the user actually clicked, mid-bob included.
    const position = KEYNOTE_TRACKS.findIndex((candidate) => candidate.id === id)
    const cardFigure = cards[position]?.querySelector('svg')
    const from = cardFigure ? snapshot(cardFigure) : null

    mode = 'track'
    track = chosen
    render(0, false, from)

    trackEvent('step_viewed', { keynote: chosen.id })
    next.focus()
  }

  /* ------------------------------- the deck ------------------------------- */

  /**
   * @param {number} target
   * @returns {void}
   */
  function go(target) {
    if (!track) return
    const clamped = Math.max(0, Math.min(track.slides.length - 1, target))
    if (clamped === index) return
    render(clamped, true)
  }

  /**
   * @param {number} nextIndex
   * @param {boolean} animate
   * @param {import('./flip.js').Snapshot | null} [firstOverride] Box to morph
   *   from, when the figure on screen is not the one being replaced.
   * @returns {void}
   */
  function render(nextIndex, animate, firstOverride = null) {
    if (!track) return

    // FIRST: measure the figure that is on screen right now. Measuring before
    // its idle loops are cancelled is deliberate: the morph should start from
    // where the figure visibly is, mid-bob included.
    const existing = art.querySelector('svg')
    const first = firstOverride ?? (animate && existing ? snapshot(existing) : null)
    stopFigures()

    index = nextIndex
    const slide = track.slides[index]
    const layout = layoutFor(slide, index, track.slides.length)

    /*
     * The dialog's own size, decided by the track rather than by this slide, so
     * it never changes while someone is walking a deck. A track either has blocks
     * throughout or not at all, which is what makes that safe.
     */
    dialog.dataset.dense = String(track.slides.some((candidate) => candidate.blocks?.length))
    stage.dataset.layout = layout
    stage.dataset.blocks = String(Boolean(slide.blocks?.length))

    // Only when arriving from the menu, where the stage is showing cards.
    if (stage.firstChild !== art) setChildren(stage, art, copy, side)

    // Every slide starts at its own heading. Some agentic slides are taller than
    // the stage, and inheriting the previous slide's scroll offset would open the
    // next one halfway down.
    stage.scrollTop = 0

    // LAST: swap in the new figure.
    // Centred slides stack the figure above the copy, so it has to be smaller
    // to leave room — the closing slide also carries two call-to-action buttons.
    const figure = puppet(slide.stage, layout === 'center' ? 190 : 240)
    setChildren(art, figure)

    // INVERT & PLAY.
    if (first) playFlip(figure, first)

    const title = h('h2', { class: 'keynote__title', tabindex: '-1' }, slide.title)
    const blocks = slide.blocks?.length ? renderBlocks(slide.blocks) : null

    setChildren(
      copy,
      slide.eyebrow ? h('p', { class: 'keynote__eyebrow' }, slide.eyebrow) : null,
      title,
      h('p', { class: 'keynote__story' }, slide.story),
      h('p', { class: 'keynote__lesson' }, slide.lesson),
      index === track.slides.length - 1
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

    setChildren(side, blocks?.element ?? null)

    // Dropped in from above, so the tag reads as a label being stamped on the
    // slide rather than as part of the copy sliding up with it.
    setChildren(term, slide.term)

    if (animate || first) {
      playEnter(copy, { delay: 90 })
      playEnter(term, { delay: 40, distance: -8 })
      // The blocks cascade on their own, and only once they are in the document.
      blocks?.reveal()
    }

    /* -------------------------------- chrome ------------------------------- */

    setChildren(
      nav,
      h('div', { class: 'keynote__nav-left' }, toTracks, prev),
      h('div', { class: 'keynote__progress' }, trackLabel, dots, counter),
      next
    )

    setChildren(
      dots,
      ...track.slides.map((_, i) =>
        h('span', { class: 'keynote__dot', dataset: { active: String(i === index) } })
      )
    )
    trackLabel.textContent = track.title
    counter.textContent = `${index + 1} / ${track.slides.length}`
    liveCounter.textContent = `${track.title}. Slide ${index + 1} de ${track.slides.length}: ${slide.title}. Nome técnico: ${slide.term}.`

    prev.disabled = index === 0
    next.disabled = index === track.slides.length - 1

    // Move focus to the new heading so the slide is announced, without
    // scrolling the dialog around.
    if (animate) title.focus({ preventScroll: true })
  }

  /* ------------------------------- input -------------------------------- */

  on(dialog, 'keydown', (event) => {
    const key = /** @type {KeyboardEvent} */ (event).key

    if (mode === 'menu') {
      // Two cards side by side, so the arrows are a roving focus rather than
      // navigation. Enter and Space are the buttons' own job.
      if (key !== 'ArrowRight' && key !== 'ArrowLeft') return
      event.preventDefault()
      const at = cards.indexOf(/** @type {HTMLButtonElement} */ (document.activeElement))
      const step = key === 'ArrowRight' ? 1 : -1
      const target = at === -1 ? 0 : Math.max(0, Math.min(cards.length - 1, at + step))
      cards[target]?.focus()
      return
    }

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
      go((track?.slides.length ?? 1) - 1)
    }
  })

  // Clicking the stage advances; clicking the backdrop closes.
  on(stage, 'click', (event) => {
    if (mode !== 'track') return
    // The closing slide's buttons and the sources list live inside the stage, so
    // advancing on every click would fire their action and move the slide at the
    // same time.
    if (/** @type {HTMLElement} */ (event.target).closest('button, a')) return
    go(index + 1)
  })

  on(dialog, 'click', (event) => {
    if (event.target === dialog) close()
  })

  let swipeStart = 0
  on(stage, 'pointerdown', (event) => {
    swipeStart = /** @type {PointerEvent} */ (event).clientX
  })
  on(stage, 'pointerup', (event) => {
    if (mode !== 'track') return
    const delta = /** @type {PointerEvent} */ (event).clientX - swipeStart
    if (Math.abs(delta) < SWIPE_THRESHOLD) return
    go(delta < 0 ? index + 1 : index - 1)
  })

  dialog.addEventListener('close', () => {
    open = false
    stopFigures()
    dialog.remove()
  })

  document.body.appendChild(dialog)

  const requested = trackId ? getTrack(trackId) : undefined
  if (requested) {
    mode = 'track'
    track = requested
    render(0, false)
  } else {
    showMenu()
  }

  dialog.showModal()

  if (mode === 'track') next.focus()
  else cards[0]?.focus()

  trackEvent('step_viewed', { keynote: requested?.id ?? 'menu' })
}
