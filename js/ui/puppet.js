// @ts-check
/**
 * The wooden puppet that carries the keynote.
 *
 * One figure, rebuilt per slide with a different `stage`. Because the outer
 * <svg> element is the FLIP morph target and keeps a stable viewBox, the figure
 * appears to transform in place rather than cross-fade: the head that was small
 * and off to one side flies and grows into the next composition.
 *
 * Purely illustrative — the narration lives in the slide text, so the whole
 * thing is aria-hidden.
 */

import { s } from '../lib/dom.js'

/**
 * Stages, in narrative order.
 * @typedef {'wood' | 'named' | 'purpose' | 'soul' | 'personality' | 'guardrails'
 *   | 'tools' | 'memory' | 'export' | 'boy'} PuppetStage
 */

const WOOD_DARK = '#8A5524'
const WOOD = '#C08447'
const WOOD_LIGHT = '#E0AE79'
const SKIN = '#F3C9A2'
const SKIN_DARK = '#D89F73'

/** Stages where the figure is flesh rather than timber. */
const REAL_BOY = new Set(['export', 'boy'])

/** Stages where the marionette is still on strings. */
const ON_STRINGS = new Set(['wood', 'named', 'purpose'])

/**
 * The nose length per stage. Growing it on the Guard Rails slide is the whole
 * point of the analogy: a limit you cannot hide.
 * @param {PuppetStage} stage
 * @returns {number}
 */
function noseLength(stage) {
  if (stage === 'wood') return 0
  if (stage === 'guardrails') return 62
  return 14
}

/**
 * @param {PuppetStage} stage
 * @returns {{ body: string, shade: string, light: string }}
 */
function palette(stage) {
  return REAL_BOY.has(stage)
    ? { body: SKIN, shade: SKIN_DARK, light: '#FFE2C8' }
    : { body: WOOD, shade: WOOD_DARK, light: WOOD_LIGHT }
}

/**
 * @param {PuppetStage} stage
 * @param {number} size
 * @returns {SVGSVGElement}
 */
export function puppet(stage, size = 320) {
  const colors = palette(stage)
  const nose = noseLength(stage)
  const gradientId = `puppet-glow-${stage}`

  /** @type {(SVGElement | null)[]} */
  const parts = []

  // ---- strings ---------------------------------------------------------
  if (ON_STRINGS.has(stage)) {
    for (const x of [78, 122]) {
      parts.push(
        s('line', {
          x1: x,
          y1: 0,
          x2: x,
          y2: 62,
          stroke: '#C9CDD4',
          'stroke-width': 1.5,
          'stroke-dasharray': '3 4',
        })
      )
    }
  }

  // ---- hat -------------------------------------------------------------
  if (stage !== 'wood') {
    parts.push(
      s('path', {
        d: 'M70 66 Q100 34 130 66 Z',
        fill: stage === 'personality' ? '#E1306C' : colors.shade,
      }),
      s('ellipse', { cx: 100, cy: 67, rx: 34, ry: 5, fill: colors.shade })
    )
  }

  // ---- head ------------------------------------------------------------
  parts.push(
    stage === 'wood'
      ? // Before anything is carved it is a plain block of timber.
        s('rect', { x: 74, y: 68, width: 52, height: 56, rx: 4, fill: colors.body })
      : s('rect', { x: 74, y: 68, width: 52, height: 58, rx: 18, fill: colors.body })
  )

  // Grain, only while it is still wood.
  if (!REAL_BOY.has(stage)) {
    parts.push(
      s('path', {
        d: 'M82 84 Q100 90 118 84 M82 100 Q100 106 118 100',
        stroke: colors.light,
        'stroke-width': 1.5,
        fill: 'none',
        opacity: 0.7,
      })
    )
  }

  // ---- face ------------------------------------------------------------
  if (stage !== 'wood') {
    const eyeY = 96
    parts.push(
      s('circle', { cx: 89, cy: eyeY, r: 4, fill: '#1B1B1F' }),
      s('circle', { cx: 111, cy: eyeY, r: 4, fill: '#1B1B1F' })
    )

    // Raised brows on the personality slide read as "curious".
    if (stage === 'personality') {
      parts.push(
        s('path', {
          d: 'M84 86 Q89 82 94 86 M106 86 Q111 82 116 86',
          stroke: '#1B1B1F',
          'stroke-width': 2,
          fill: 'none',
          'stroke-linecap': 'round',
        })
      )
    }

    // Nose: a wedge pointing right, its length driven by the stage.
    parts.push(
      s('path', {
        d: `M100 100 L${100 + nose} 106 L100 112 Z`,
        fill: colors.shade,
      })
    )

    parts.push(
      s('path', {
        d: stage === 'guardrails' ? 'M90 118 Q100 114 110 118' : 'M90 116 Q100 122 110 116',
        stroke: '#1B1B1F',
        'stroke-width': 2,
        fill: 'none',
        'stroke-linecap': 'round',
      })
    )
  }

  // ---- body ------------------------------------------------------------
  parts.push(
    s('rect', {
      x: 78,
      y: 130,
      width: 44,
      height: 54,
      rx: REAL_BOY.has(stage) ? 14 : 6,
      fill: colors.body,
    })
  )

  // ---- limbs -----------------------------------------------------------
  parts.push(
    s('path', {
      d: 'M78 142 L56 162 M122 142 L144 162',
      stroke: colors.shade,
      'stroke-width': 9,
      'stroke-linecap': 'round',
      fill: 'none',
    }),
    s('path', {
      d: 'M88 184 L84 218 M112 184 L116 218',
      stroke: colors.shade,
      'stroke-width': 9,
      'stroke-linecap': 'round',
      fill: 'none',
    })
  )

  // ---- per-stage accents ----------------------------------------------
  if (stage === 'purpose') {
    // Geppetto's wish upon a star.
    parts.push(
      s('path', {
        d: 'M150 44 l5 11 12 2 -9 9 2 12 -10 -6 -10 6 2 -12 -9 -9 12 -2 Z',
        fill: '#FCAF45',
      })
    )
  }

  if (stage === 'soul') {
    parts.push(
      s('path', {
        d: 'M100 168 c-9 -9 -18 -16 -18 -25 a9 9 0 0 1 18 -5 a9 9 0 0 1 18 5 c0 9 -9 16 -18 25 Z',
        fill: '#E1306C',
        filter: `url(#${gradientId})`,
      })
    )
  }

  if (stage === 'guardrails') {
    // Jiminy on the shoulder: the conscience that speaks up.
    parts.push(
      s('circle', { cx: 138, cy: 132, r: 9, fill: '#2FA36B' }),
      s('circle', { cx: 135, cy: 130, r: 2, fill: '#0F2E1E' }),
      s('path', {
        d: 'M144 126 l8 -7 M144 132 l9 -1',
        stroke: '#2FA36B',
        'stroke-width': 2,
        'stroke-linecap': 'round',
      })
    )
  }

  if (stage === 'tools') {
    // A lantern in hand — what he needs to get out of the whale.
    parts.push(
      s('line', { x1: 144, y1: 162, x2: 144, y2: 176, stroke: colors.shade, 'stroke-width': 2 }),
      s('rect', { x: 133, y: 176, width: 22, height: 22, rx: 4, fill: '#FCAF45' }),
      s('rect', { x: 138, y: 181, width: 12, height: 12, rx: 2, fill: '#FFF3D6' })
    )
  }

  if (stage === 'memory') {
    // A book of everything the adventures taught him.
    parts.push(
      s('rect', { x: 42, y: 158, width: 30, height: 24, rx: 3, fill: '#7C3AED' }),
      s('path', {
        d: 'M57 158 v24 M46 165 h8 M60 165 h8',
        stroke: '#E6DCFF',
        'stroke-width': 1.5,
      })
    )
  }

  if (REAL_BOY.has(stage)) {
    // Cut strings, drawn slack, to show he is on his own now.
    parts.push(
      s('path', {
        d: 'M62 26 q6 10 0 20 M138 26 q-6 10 0 20',
        stroke: '#D8DCE3',
        'stroke-width': 1.5,
        fill: 'none',
      })
    )
  }

  return s(
    'svg',
    {
      class: 'puppet',
      viewBox: '0 0 200 240',
      width: size,
      height: size * 1.2,
      'aria-hidden': 'true',
      focusable: 'false',
    },
    s(
      'defs',
      null,
      s(
        'filter',
        { id: gradientId, x: '-60%', y: '-60%', width: '220%', height: '220%' },
        s('feGaussianBlur', { stdDeviation: '4', result: 'blur' }),
        s(
          'feMerge',
          null,
          s('feMergeNode', { in: 'blur' }),
          s('feMergeNode', { in: 'SourceGraphic' })
        )
      )
    ),
    ...parts.filter(Boolean)
  )
}
