import { beforeEach } from 'vitest'
import { setLogSink } from '../js/lib/logger.js'
import { setAnalyticsHandler } from '../js/lib/analytics.js'

// The console seams exist so they can be redirected; tests take them to /dev/null
// to keep failures readable. Assertions that care about logging can install
// their own sink for the duration of a test.
setLogSink(() => {})
setAnalyticsHandler(() => {})

/**
 * jsdom ships no matchMedia, and the app uses it for real decisions: whether to
 * autofocus a field, whether the preview panel is in its narrow layout. Returning
 * a flat `false` would answer "not wide" and "not narrow" at the same time, so
 * this evaluates min-width/max-width against the window instead and stays
 * self-consistent.
 *
 * @param {string} query
 * @returns {MediaQueryList}
 */
function evaluateMediaQuery(query) {
  const width = window.innerWidth
  let matches = true

  for (const [, feature, value] of query.matchAll(/\((min|max)-width:\s*(\d+)px\)/g)) {
    matches = matches && (feature === 'min' ? width >= Number(value) : width <= Number(value))
  }

  return /** @type {MediaQueryList} */ ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })
}

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = evaluateMediaQuery
}

/**
 * jsdom parses <dialog> but implements none of its methods. Every dialog in the
 * app does its teardown in the `close` event handler, so a stub that skips that
 * event would leak a dialog per test instead of failing visibly.
 *
 * The modal semantics that are genuinely missing here — the backdrop, the focus
 * trap, Escape — are the browser's job and are not what these tests assert.
 */
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }

  HTMLDialogElement.prototype.show = function show() {
    this.open = true
  }

  /** @param {string} [returnValue] */
  HTMLDialogElement.prototype.close = function close(returnValue) {
    if (!this.open) return
    this.open = false
    if (returnValue !== undefined) this.returnValue = returnValue
    this.dispatchEvent(new Event('close'))
  }
}

beforeEach(() => {
  if (typeof document !== 'undefined') {
    document.body.replaceChildren()

    const toastRegion = document.createElement('div')
    toastRegion.id = 'toast-region'
    document.body.appendChild(toastRegion)

    const liveRegion = document.createElement('div')
    liveRegion.id = 'live-region'
    document.body.appendChild(liveRegion)
  }

  if (typeof localStorage !== 'undefined') localStorage.clear()
})
