// @ts-check
/**
 * FLIP morph — First, Last, Invert, Play.
 *
 * Measure an element, let the layout change, measure again, then animate from
 * the inverted difference back to nothing. The element appears to fly and
 * stretch from its old position into its new one, which is the Keynote
 * "Magic Move" effect.
 *
 * Hand-rolled with the Web Animations API rather than the View Transitions API
 * so the result is identical in every browser, including Firefox. That matters
 * here: the morph *is* the feature, not a garnish.
 *
 * The morph target must have `transform-origin: 0 0`, otherwise the scale is
 * applied around the centre and the maths below lands in the wrong place.
 */

/**
 * @typedef {Object} Snapshot
 * @property {number} left
 * @property {number} top
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} Inversion
 * @property {number} dx
 * @property {number} dy
 * @property {number} sx
 * @property {number} sy
 */

/** Below this, a difference is not worth animating. */
const EPSILON = 0.5

/**
 * The pure core, kept separate from the DOM so it can be tested directly.
 *
 * Scales fall back to 1 when a dimension is zero — an element that was hidden
 * has no size to scale from, and dividing by it would yield Infinity.
 *
 * @param {Snapshot} first
 * @param {Snapshot} last
 * @returns {Inversion}
 */
export function invertTransform(first, last) {
  return {
    dx: first.left - last.left,
    dy: first.top - last.top,
    sx: last.width === 0 ? 1 : first.width / last.width,
    sy: last.height === 0 ? 1 : first.height / last.height,
  }
}

/**
 * @param {Inversion} inversion
 * @returns {boolean} True when the change is too small to be worth animating.
 */
export function isNegligible({ dx, dy, sx, sy }) {
  return (
    Math.abs(dx) < EPSILON &&
    Math.abs(dy) < EPSILON &&
    Math.abs(sx - 1) < 0.01 &&
    Math.abs(sy - 1) < 0.01
  )
}

/**
 * @param {Inversion} inversion
 * @returns {string}
 */
export function toTransform({ dx, dy, sx, sy }) {
  return `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`
}

/** @returns {boolean} */
export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Capture an element's current box.
 * @param {Element} el
 * @returns {Snapshot}
 */
export function snapshot(el) {
  const rect = el.getBoundingClientRect()
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
}

/**
 * @typedef {Object} FlipOptions
 * @property {number} [duration] Milliseconds. Defaults to 620.
 * @property {string} [easing]
 */

/**
 * Play the morph from a snapshot taken before the layout changed.
 *
 * The CSS `prefers-reduced-motion` rule in base.css only neutralises CSS
 * animations — element.animate() is untouched by it — so the preference has to
 * be honoured explicitly here.
 *
 * @param {Element} el
 * @param {Snapshot} first
 * @param {FlipOptions} [options]
 * @returns {Animation | null} null when nothing was animated.
 */
export function playFlip(el, first, options = {}) {
  if (prefersReducedMotion()) return null

  const inversion = invertTransform(first, snapshot(el))
  if (isNegligible(inversion)) return null

  return el.animate(
    [{ transform: toTransform(inversion) }, { transform: 'none' }],
    {
      duration: options.duration ?? 620,
      easing: options.easing ?? 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'none',
    }
  )
}

/**
 * Slide-and-fade entrance for content that has no counterpart to morph from.
 * @param {Element} el
 * @param {{ delay?: number, distance?: number, duration?: number }} [options]
 * @returns {Animation | null}
 */
export function playEnter(el, options = {}) {
  if (prefersReducedMotion()) return null

  return el.animate(
    [
      { opacity: 0, transform: `translateY(${options.distance ?? 14}px)` },
      { opacity: 1, transform: 'none' },
    ],
    {
      duration: options.duration ?? 440,
      delay: options.delay ?? 0,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'backwards',
    }
  )
}
