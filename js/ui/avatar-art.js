// @ts-check
/**
 * Generated avatar artwork (SPEC 16).
 *
 * Each avatar is a gradient field with a glyph knocked out on top, drawn at
 * render time. Because it is geometry rather than a bitmap it stays crisp at
 * any size and adds nothing to the page weight budget in SPEC 66.
 */

import { s } from '../lib/dom.js'
import { ICON_SHAPES } from '../icons.data.js'
import { getAvatar } from '../data/avatars.js'

const VIEWBOX = 96
/** The 24x24 glyph is scaled 2x and centred inside the 96x96 field. */
const GLYPH_SCALE = 2
const GLYPH_OFFSET = (VIEWBOX - 24 * GLYPH_SCALE) / 2

/**
 * @param {string | undefined} avatarId
 * @param {number} [size]
 * @returns {SVGSVGElement}
 */
export function avatarArt(avatarId, size = 96) {
  const avatar = getAvatar(avatarId)
  // Gradient ids must be unique per document, or the first one wins everywhere.
  const gradientId = `avatar-${avatar.id}-${Math.round(size)}`
  const shapes = ICON_SHAPES[avatar.icon] ?? []

  return s(
    'svg',
    {
      class: 'avatar-art',
      width: size,
      height: size,
      viewBox: `0 0 ${VIEWBOX} ${VIEWBOX}`,
      role: 'img',
      'aria-label': `Avatar ${avatar.name}`,
    },
    s(
      'defs',
      null,
      s(
        'linearGradient',
        { id: gradientId, x1: '0', y1: '0', x2: '1', y2: '1' },
        s('stop', { offset: '0', 'stop-color': avatar.gradient[0] }),
        s('stop', { offset: '0.55', 'stop-color': avatar.gradient[1] }),
        s('stop', { offset: '1', 'stop-color': avatar.gradient[2] })
      )
    ),
    s('rect', { width: VIEWBOX, height: VIEWBOX, rx: VIEWBOX / 2, fill: `url(#${gradientId})` }),
    s(
      'g',
      {
        transform: `translate(${GLYPH_OFFSET} ${GLYPH_OFFSET}) scale(${GLYPH_SCALE})`,
        fill: 'none',
        stroke: '#ffffff',
        'stroke-width': 1.6,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        opacity: '0.96',
      },
      ...shapes.map((shape) =>
        s(/** @type {keyof SVGElementTagNameMap} */ (shape.t), { ...shape.a })
      )
    )
  )
}
