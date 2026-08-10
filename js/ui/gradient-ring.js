// @ts-check
/**
 * The neon story ring around an avatar (SPEC 15, SPEC 79).
 *
 * The ring is a gradient-filled circle with the avatar sitting on a white pad
 * inside it, which is what produces the thin gap between ring and portrait.
 */

import { h } from '../lib/dom.js'

/**
 * @typedef {Object} GradientRingOptions
 * @property {number} [size] Outer diameter in pixels. Defaults to 160.
 * @property {number} [thickness] Ring thickness. Defaults to 4.
 * @property {boolean} [glow] Apply the soft outer glow. Defaults to true.
 * @property {boolean} [spin] Rotate the ring through the neon spectrum.
 * @property {string} [class]
 */

/**
 * @param {Node} child Usually an avatar.
 * @param {GradientRingOptions} [options]
 * @returns {HTMLElement}
 */
export function gradientRing(child, options = {}) {
  const size = options.size ?? 160
  const thickness = options.thickness ?? 4
  const gap = 3
  const inner = size - (thickness + gap) * 2

  const portrait = h(
    'span',
    {
      class: 'gradient-ring__inner',
      style: { width: `${inner}px`, height: `${inner}px` },
    },
    child
  )

  return h(
    'span',
    {
      class: options.class ? `gradient-ring ${options.class}` : 'gradient-ring',
      style: {
        width: `${size}px`,
        height: `${size}px`,
        padding: `${thickness + gap}px`,
      },
      dataset: {
        glow: String(options.glow !== false),
        spin: String(options.spin === true),
      },
    },
    portrait
  )
}
