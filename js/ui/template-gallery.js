// @ts-check
/**
 * The full template gallery.
 *
 * Thirty agents is too many for one scroll, so they are dealt out in pages the
 * way a photo carousel is: swipe, arrows, dots, and a page that slides in from
 * the side. The point of the format is that the user can see a whole page at
 * once and compare, instead of pulling an endless list past their eyes.
 *
 * Pages that are off screen are marked `inert`, so Tab never lands on a card
 * nobody can see. That is the part a pure CSS carousel always gets wrong.
 */

import { h, on, setChildren } from '../lib/dom.js'
import { icon } from '../icons.js'
import { TEMPLATES } from '../data/templates.js'
import { templateCard } from '../components/template-card.js'
import { trackEvent } from '../lib/analytics.js'

/** Two rows of three: a page the eye can take in at a glance. */
export const PER_PAGE = 6

/** Distance in px a horizontal drag must cover to count as a swipe. */
const SWIPE_THRESHOLD = 48

/**
 * Split a list into fixed-size pages. Pure, so the paging maths is testable
 * without a DOM.
 *
 * @template T
 * @param {ReadonlyArray<T>} items
 * @param {number} perPage
 * @returns {T[][]}
 */
export function paginate(items, perPage) {
  if (perPage < 1) return [[...items]]
  /** @type {T[][]} */
  const pages = []
  for (let i = 0; i < items.length; i += perPage) pages.push(items.slice(i, i + perPage))
  return pages.length > 0 ? pages : [[]]
}

let open = false

/** @returns {void} */
export function openTemplateGallery() {
  if (open) return
  open = true

  const pages = paginate(TEMPLATES, PER_PAGE)
  let index = 0

  const track = h(
    'div',
    { class: 'gallery__track' },
    ...pages.map((page, pageIndex) =>
      h(
        'ul',
        {
          class: 'gallery__page template-grid',
          'aria-label': `Página ${pageIndex + 1} de ${pages.length}`,
        },
        ...page.map((template) => templateCard(template, () => close()))
      )
    )
  )

  const dots = h('div', { class: 'gallery__dots' })
  const counter = h('span', { class: 'gallery__counter' })
  const live = h('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' })

  const prev = h(
    'button',
    {
      type: 'button',
      class: 'gallery__arrow gallery__arrow--prev',
      'aria-label': 'Modelos anteriores',
      onclick: () => go(index - 1),
    },
    icon('chevron-left', { size: 18 })
  )

  const next = h(
    'button',
    {
      type: 'button',
      class: 'gallery__arrow gallery__arrow--next',
      'aria-label': 'Próximos modelos',
      onclick: () => go(index + 1),
    },
    icon('chevron-right', { size: 18 })
  )

  const viewport = h('div', { class: 'gallery__viewport' }, track)

  const dialog = h(
    'dialog',
    { class: 'gallery', 'aria-label': 'Todos os modelos' },
    h(
      'header',
      { class: 'gallery__header' },
      h(
        'div',
        null,
        h('h2', { class: 'gallery__title section-title' }, 'Todos os modelos'),
        h(
          'p',
          { class: 'helper' },
          `${TEMPLATES.length} agentes completos. Escolha um e o builder abre com as nove etapas já preenchidas.`
        )
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'gallery__close',
          'aria-label': 'Fechar',
          onclick: () => close(),
        },
        icon('x', { size: 16 })
      )
    ),
    h('div', { class: 'gallery__stage' }, prev, viewport, next),
    h('footer', { class: 'gallery__nav' }, dots, counter),
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
    const clamped = Math.max(0, Math.min(pages.length - 1, target))
    if (clamped === index) return
    index = clamped
    render()
  }

  /** @returns {void} */
  function render() {
    track.style.transform = `translateX(-${index * 100}%)`

    Array.from(track.children).forEach((page, i) => {
      const element = /** @type {HTMLElement} */ (page)
      element.inert = i !== index
      element.setAttribute('aria-hidden', String(i !== index))
    })

    setChildren(
      dots,
      ...pages.map((_, i) =>
        h('button', {
          type: 'button',
          class: 'gallery__dot',
          'aria-label': `Página ${i + 1}`,
          'aria-current': i === index ? 'true' : null,
          dataset: { active: String(i === index) },
          onclick: () => go(i),
        })
      )
    )

    counter.textContent = `${index + 1} / ${pages.length}`
    live.textContent = `Página ${index + 1} de ${pages.length}`
    prev.disabled = index === 0
    next.disabled = index === pages.length - 1
  }

  /* ------------------------------- input -------------------------------- */

  on(dialog, 'keydown', (event) => {
    const key = /** @type {KeyboardEvent} */ (event).key
    if (key === 'ArrowRight') {
      event.preventDefault()
      go(index + 1)
    } else if (key === 'ArrowLeft') {
      event.preventDefault()
      go(index - 1)
    } else if (key === 'Home') {
      event.preventDefault()
      go(0)
    } else if (key === 'End') {
      event.preventDefault()
      go(pages.length - 1)
    }
  })

  let swipeStart = 0
  on(viewport, 'pointerdown', (event) => {
    swipeStart = /** @type {PointerEvent} */ (event).clientX
  })
  on(viewport, 'pointerup', (event) => {
    const delta = /** @type {PointerEvent} */ (event).clientX - swipeStart
    if (Math.abs(delta) < SWIPE_THRESHOLD) return
    go(delta < 0 ? index + 1 : index - 1)
  })

  on(dialog, 'click', (event) => {
    if (event.target === dialog) close()
  })

  dialog.addEventListener('close', () => {
    open = false
    dialog.remove()
  })

  document.body.appendChild(dialog)
  render()
  dialog.showModal()

  trackEvent('step_viewed', { gallery: 'templates' })
}
