// @ts-check
/**
 * Icon factory (ADR-005 without the react dependency).
 *
 * Builds each glyph from the structured geometry in icons.data.js using
 * createElementNS, so icons never touch the HTML parser (SPEC 67).
 */

import { s } from './lib/dom.js'
import { ICON_SHAPES } from './icons.data.js'

/** @typedef {keyof typeof ICON_SHAPES} IconName */

/**
 * @typedef {Object} IconOptions
 * @property {number} [size] Pixel size for width/height. Defaults to 18.
 * @property {number} [strokeWidth] Defaults to 1.75.
 * @property {string} [class] Extra class names.
 */

/**
 * @param {IconName} name
 * @param {IconOptions} [options]
 * @returns {SVGSVGElement}
 */
export function icon(name, options = {}) {
  const shapes = ICON_SHAPES[name]
  if (!shapes) throw new Error(`Unknown icon: ${String(name)}`)

  const size = options.size ?? 18

  const svg = s(
    'svg',
    {
      class: options.class ? `icon ${options.class}` : 'icon',
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': options.strokeWidth ?? 1.75,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    ...shapes.map((shape) =>
      s(/** @type {keyof SVGElementTagNameMap} */ (shape.t), { ...shape.a })
    )
  )

  return svg
}

/**
 * True when the name maps to a bundled glyph. Used by data modules so a typo
 * fails a test instead of throwing at render time.
 * @param {string} name
 * @returns {name is IconName}
 */
export function hasIcon(name) {
  return Object.prototype.hasOwnProperty.call(ICON_SHAPES, name)
}

export { ICON_SHAPES }
