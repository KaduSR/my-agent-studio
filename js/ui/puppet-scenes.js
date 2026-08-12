// @ts-check
/**
 * The agentic scenery.
 *
 * The keynote's second track talks about systems rather than about steps: a
 * model that answers and forgets, a rail someone painted in advance, a loop the
 * puppet drives itself, three gates, a bridge of planks. Those are stages of the
 * same figure, so they belong to the same drawing, but each one needs props that
 * the first track never had.
 *
 * They live here instead of in ui/puppet.js for one reason only: that file is
 * already the whole figure, and twelve more scenes inline would bury it. The
 * split is by *scenery*, not by figure. `puppet()` stays the single entry point,
 * which is what keeps the FLIP morph working: one <svg>, one stable viewBox, the
 * same body flying from composition to composition.
 *
 * Each builder returns four things:
 *
 *   behind          drawn before the body, so it reads as the world he is in
 *   front           drawn after it, so it reads as something he holds or wears
 *   motions         idle loops, registered by puppet.js so they stay cancellable
 *   figureTransform a static wrapper transform, for scenes that need the body
 *                   smaller or shifted to make room for the props
 *
 * Everything is purely illustrative. The narration is in the slide text and the
 * whole drawing is aria-hidden, so nothing here has to be readable as language.
 */

import { s } from '../lib/dom.js'

/**
 * Same anchoring trick as ui/puppet.js: `transform-box: view-box` is what makes
 * the origin read in viewBox units, so a signpost can creak around its foot
 * rather than around the middle of its own bounding box.
 *
 * @param {string} origin `transform-origin`, in viewBox units.
 * @param {(SVGElement | null)[]} children
 * @returns {SVGGElement}
 */
function pivot(origin, children) {
  return s(
    'g',
    { style: { transformBox: 'view-box', transformOrigin: origin } },
    children.filter(Boolean)
  )
}

/**
 * @typedef {Object} SceneMotion
 * @property {Element | null} target
 * @property {Keyframe[]} keyframes
 * @property {import('./puppet.js').IdleOptions} options
 */

/**
 * @typedef {Object} Scene
 * @property {SVGElement[]} [behind] Drawn before the body.
 * @property {SVGElement[]} [front] Drawn after the body.
 * @property {SceneMotion[]} [motions]
 * @property {string} [figureTransform] Static transform for the body wrapper.
 */

/**
 * @typedef {Object} SceneContext
 * @property {{ body: string, shade: string, light: string }} colors
 * @property {string} gradientId Id of the glow filter puppet.js defines.
 * @property {string} wood
 * @property {string} woodDark
 * @property {string} spark
 */

/* ----------------------------- shared colours ----------------------------- */

const INK = '#1B1B1F'
const PAPER = '#FBFAF5'
const LINE = '#C9CDD4'
const RAIL = '#B9BEC7'
const WATER = '#7FA1F2'
const LEAF = '#2FA36B'
const FLAME = '#FCAF45'
const PLUM = '#7C3AED'
const ROSE = '#E1306C'

/* -------------------------------- helpers -------------------------------- */

/**
 * @param {Element | null} target
 * @param {Keyframe[]} keyframes
 * @param {import('./puppet.js').IdleOptions} options
 * @returns {SceneMotion}
 */
function motion(target, keyframes, options) {
  return { target, keyframes, options }
}

/**
 * A chase: one light travelling around a fixed set of markers.
 *
 * Each marker runs the same period, offset by its position, and the keyframes
 * are on for a quarter of it. Written as one non-alternating loop per marker
 * rather than as a single animation moving one element, because the markers sit
 * at unrelated coordinates and interpolating between them would cut corners.
 *
 * @param {(Element | null)[]} markers
 * @param {number} beat Milliseconds each marker stays lit.
 * @returns {SceneMotion[]}
 */
function chase(markers, beat) {
  const period = beat * markers.length
  return markers.map((marker, index) =>
    motion(
      marker,
      [
        { opacity: 0, offset: 0 },
        { opacity: 1, offset: 0.08 },
        { opacity: 1, offset: 1 / markers.length - 0.04 },
        { opacity: 0, offset: 1 / markers.length + 0.04 },
        { opacity: 0, offset: 1 },
      ],
      { duration: period, delay: -index * beat, direction: 'normal', easing: 'linear' }
    )
  )
}

/**
 * A run of dashed paths, drawn twice.
 *
 * A faint copy that is always there, and a bright copy that lights in turn.
 * Chasing a single copy was the first attempt and it was wrong: between beats the
 * diagram vanished, so the shape it exists to explain was missing most of the
 * time. The faint layer is the shape; the bright one is the beat.
 *
 * @param {string[]} paths
 * @param {number} beat
 * @param {string} color
 * @returns {{ nodes: SVGElement[], motions: SceneMotion[] }}
 */
function litTrail(paths, beat, color) {
  const base = paths.map((d) =>
    s('path', {
      d,
      stroke: LINE,
      'stroke-width': 1.8,
      'stroke-dasharray': '4 5',
      fill: 'none',
      opacity: 0.5,
    })
  )

  const lit = paths.map((d) =>
    s('path', {
      d,
      stroke: color,
      'stroke-width': 2.2,
      'stroke-dasharray': '4 5',
      fill: 'none',
      opacity: 0,
    })
  )

  return { nodes: [...base, ...lit], motions: chase(lit, beat) }
}

/**
 * Reveal a set of marks one after another, keeping every one that has appeared,
 * then start over.
 *
 * The difference from `chase` is the whole point wherever it is used: a diary
 * being written and a checklist being ticked off are about accumulation, and one
 * line visible at a time would say the opposite.
 *
 * @param {(Element | null)[]} marks
 * @param {number} beat Milliseconds between marks.
 * @returns {SceneMotion[]}
 */
function write(marks, beat) {
  // A pause at the end, so the finished state is what the eye rests on.
  const period = beat * (marks.length + 3)
  return marks.map((mark, index) => {
    const at = (beat * index) / period
    return motion(
      mark,
      [
        { opacity: 0, offset: 0 },
        { opacity: 0, offset: at },
        { opacity: 1, offset: Math.min(1, at + 0.04) },
        { opacity: 1, offset: 1 },
      ],
      { duration: period, direction: 'normal', easing: 'linear' }
    )
  })
}

/**
 * The cricket, at any size. The conscience shows up in three of these scenes,
 * so it is worth one function.
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @returns {SVGGElement}
 */
function cricket(cx, cy, r) {
  return pivot(`${cx}px ${cy}px`, [
    s('circle', { cx, cy, r, fill: LEAF }),
    s('circle', { cx: cx - r * 0.33, cy: cy - r * 0.22, r: Math.max(1.2, r * 0.22), fill: '#0F2E1E' }),
    s('path', {
      d: `M${cx + r * 0.7} ${cy - r * 0.7} l${r * 0.9} -${r * 0.8} M${cx + r * 0.7} ${cy} l${r} -${r * 0.12}`,
      stroke: LEAF,
      'stroke-width': Math.max(1.2, r * 0.22),
      'stroke-linecap': 'round',
    }),
  ])
}

/**
 * A sheet of paper with lines of writing on it. Returns the group and the lines
 * separately, because several scenes want to reveal the lines one at a time.
 * @param {{ x: number, y: number, width: number, height: number, rows: number, tilt?: number }} config
 * @returns {{ group: SVGGElement, rows: SVGPathElement[] }}
 */
function sheet({ x, y, width, height, rows, tilt = 0 }) {
  const step = (height - 22) / rows
  /** @type {SVGPathElement[]} */
  const lines = []

  for (let i = 0; i < rows; i += 1) {
    const at = y + 16 + i * step
    // Alternating lengths so it reads as prose rather than as a form.
    const run = i % 3 === 2 ? width * 0.42 : width * 0.68
    lines.push(
      s('path', {
        d: `M${x + 8} ${at} h${run}`,
        stroke: LINE,
        'stroke-width': 1.6,
        'stroke-linecap': 'round',
      })
    )
  }

  const group = pivot(`${x + width / 2}px ${y + height / 2}px`, [
    s('rect', {
      x,
      y,
      width,
      height,
      rx: 3,
      fill: PAPER,
      stroke: LINE,
      'stroke-width': 1.2,
      transform: tilt ? `rotate(${tilt} ${x + width / 2} ${y + height / 2})` : null,
    }),
    ...lines.map((line) =>
      tilt
        ? s('g', { transform: `rotate(${tilt} ${x + width / 2} ${y + height / 2})` }, line)
        : line
    ),
  ])

  return { group, rows: lines }
}

/**
 * Two undulating lines. The open sea, and the water under the plank bridge.
 * @param {number} y
 * @param {string} color
 * @returns {SVGGElement}
 */
function waves(y, color = WATER) {
  return pivot(`100px ${y}px`, [
    s('path', {
      d: `M-20 ${y} q14 -6 28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0`,
      stroke: color,
      'stroke-width': 2,
      fill: 'none',
      'stroke-linecap': 'round',
    }),
    s('path', {
      d: `M-20 ${y + 9} q14 6 28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0`,
      stroke: color,
      'stroke-width': 2,
      fill: 'none',
      opacity: 0.6,
      'stroke-linecap': 'round',
    }),
  ])
}

/**
 * A small arrowhead, pointing along a direction given in degrees.
 * @param {number} x
 * @param {number} y
 * @param {number} angle
 * @param {string} color
 * @param {number} [size]
 * @returns {SVGPathElement}
 */
function arrowHead(x, y, angle, color, size = 7) {
  return s('path', {
    d: `M0 0 L-${size} -${size * 0.55} L-${size} ${size * 0.55} Z`,
    fill: color,
    transform: `translate(${x} ${y}) rotate(${angle})`,
  })
}

/* --------------------------------- scenes --------------------------------- */

/**
 * 1. A stateless call: it answers out loud, and nothing of it stays.
 *
 * The puffs of speech pulse in and out on their own beats, and the crate beside
 * him is drawn open, empty and perfectly still. Everything else in this deck
 * breathes; the box that should hold state does not, which is the whole point.
 *
 * @param {SceneContext} ctx
 * @returns {Scene}
 */
function stateless(ctx) {
  const puffs = [0, 1, 2].map((index) =>
    s('ellipse', {
      cx: 142 + index * 18,
      cy: index % 2 === 0 ? 104 : 96,
      rx: 7,
      ry: 5.5,
      fill: [ROSE, FLAME, PLUM][index],
      style: {
        transformBox: 'view-box',
        transformOrigin: `${142 + index * 18}px ${index % 2 === 0 ? 104 : 96}px`,
      },
    })
  )

  // Drawn in his own timber, dashed and at half strength: it is a real crate on
  // a real bench, and it holds nothing.
  const crate = pivot('44px 200px', [
    s('path', {
      d: 'M22 186 L66 186 L66 214 L22 214 Z',
      fill: 'none',
      stroke: ctx.colors.shade,
      'stroke-width': 1.8,
      'stroke-dasharray': '4 4',
      opacity: 0.55,
    }),
    // The lid, propped open. There is nothing to close it on.
    s('path', {
      d: 'M22 186 L14 174',
      stroke: ctx.colors.shade,
      'stroke-width': 1.8,
      'stroke-dasharray': '4 4',
      opacity: 0.55,
    }),
  ])

  return {
    behind: [crate],
    front: puffs,
    motions: puffs.map((puff, index) =>
      motion(
        puff,
        [
          { transform: 'translateX(-6px) scale(0.5)', opacity: 0.95 },
          { transform: 'translateX(12px) scale(1.2)', opacity: 0 },
        ],
        { duration: 760, delay: -index * 240 }
      )
    ),
  }
}

/**
 * 2. The augmented model: a lantern, a book and a notebook, all at once.
 *
 * The three props are the three additions from the article, and the dashed arcs
 * exist so they read as feeding one head rather than as three separate gadgets.
 * The lit network stays visible because the point is that this is still the same
 * model underneath, only reachable now.
 *
 * @param {SceneContext} ctx
 * @returns {Scene}
 */
function augmented(ctx) {
  const lantern = pivot('146px 164px', [
    s('line', { x1: 146, y1: 164, x2: 146, y2: 178, stroke: ctx.colors.shade, 'stroke-width': 2 }),
    s('rect', { x: 135, y: 178, width: 22, height: 22, rx: 4, fill: FLAME }),
    s('rect', { x: 140, y: 183, width: 12, height: 12, rx: 2, fill: '#FFF3D6' }),
  ])

  const openBook = pivot('42px 132px', [
    s('path', {
      d: 'M42 118 L14 124 L14 146 L42 140 Z',
      fill: PAPER,
      stroke: LINE,
      'stroke-width': 1.2,
    }),
    s('path', {
      d: 'M42 118 L70 124 L70 146 L42 140 Z',
      fill: PAPER,
      stroke: LINE,
      'stroke-width': 1.2,
    }),
    s('path', {
      d: 'M20 130 h16 M20 136 h11 M48 131 h16 M48 137 h11',
      stroke: LINE,
      'stroke-width': 1.3,
      'stroke-linecap': 'round',
    }),
    s('path', { d: 'M42 118 v22', stroke: ctx.spark, 'stroke-width': 2.2, 'stroke-linecap': 'round' }),
  ])

  const notebook = pivot('44px 196px', [
    s('rect', { x: 28, y: 182, width: 32, height: 26, rx: 3, fill: PLUM }),
    s('path', { d: 'M44 182 v26 M32 190 h8 M48 190 h8', stroke: '#E6DCFF', 'stroke-width': 1.5 }),
  ])

  // The wiring: each prop reaches the same head.
  const feeds = litTrail(
    ['M44 122 Q60 96 76 90', 'M42 186 Q64 160 76 106', 'M146 170 Q140 130 126 100'],
    520,
    ctx.spark
  )

  const network = pivot('100px 84px', [
    s('path', {
      d: 'M84 82 L100 74 L116 82 M84 82 L92 92 L108 92 L116 82 M92 92 L100 74 L108 92',
      stroke: ctx.spark,
      'stroke-width': 1.6,
      fill: 'none',
      opacity: 0.8,
    }),
    ...[
      [100, 74],
      [84, 82],
      [116, 82],
      [92, 92],
      [108, 92],
    ].map(([cx, cy]) => s('circle', { cx, cy, r: 3, fill: ctx.spark, filter: `url(#${ctx.gradientId})` })),
  ])

  return {
    behind: [...feeds.nodes, openBook, notebook],
    front: [network, lantern],
    motions: [
      ...feeds.motions,
      motion(lantern, [{ transform: 'rotate(-8deg)' }, { transform: 'rotate(9deg)' }], {
        duration: 940,
        delay: -200,
      }),
      motion(
        openBook,
        [
          { transform: 'translateY(2px) rotate(-3deg)' },
          { transform: 'translateY(-3px) rotate(3deg)' },
        ],
        { duration: 1380 }
      ),
      motion(
        notebook,
        [
          { transform: 'translateY(3px) rotate(-4deg)' },
          { transform: 'translateY(-3px) rotate(4deg)' },
        ],
        { duration: 1520, delay: -300 }
      ),
      motion(
        network,
        [
          { transform: 'scale(0.94)', opacity: 0.55 },
          { transform: 'scale(1.07)', opacity: 1 },
        ],
        { duration: 900 }
      ),
    ],
  }
}

/**
 * 3. A workflow: the path was painted before he took a step.
 *
 * The control cross is Geppetto's, the stations are numbered by their order and
 * not by anything he decides, and the travelling dot never reverses. That last
 * detail is the whole difference from the next scene, so the loop is deliberately
 * non-alternating.
 *
 * @param {SceneContext} ctx
 * @returns {Scene}
 */
function workflow(ctx) {
  const rig = pivot('100px 0', [
    s('rect', { x: 52, y: 8, width: 96, height: 7, rx: 3.5, fill: ctx.woodDark }),
    s('rect', { x: 96.5, y: 0, width: 7, height: 26, rx: 3.5, fill: ctx.wood }),
    ...[78, 122].map((x) =>
      s('line', {
        x1: x,
        y1: 14,
        x2: x,
        y2: 62,
        stroke: '#C9CDD4',
        'stroke-width': 1.5,
        'stroke-dasharray': '3 4',
      })
    ),
  ])

  const stops = [30, 76, 122, 168]

  const rail = s('g', null, [
    s('rect', { x: 10, y: 226, width: 180, height: 5, rx: 2.5, fill: RAIL }),
    ...stops.flatMap((x, index) => [
      s('circle', { cx: x, cy: 228.5, r: 6, fill: index === 0 ? ctx.wood : '#FFFFFF', stroke: RAIL, 'stroke-width': 2 }),
      index < stops.length - 1
        ? s('path', {
            d: `M${x + 12} 224 l6 4.5 -6 4.5`,
            stroke: RAIL,
            'stroke-width': 1.6,
            fill: 'none',
            'stroke-linecap': 'round',
          })
        : null,
    ]),
  ])

  const runner = s('circle', {
    cx: 30,
    cy: 228.5,
    r: 3.6,
    fill: ROSE,
    filter: `url(#${ctx.gradientId})`,
    style: { transformBox: 'view-box', transformOrigin: '30px 228.5px' },
  })

  return {
    behind: [rail, rig],
    front: [runner],
    motions: [
      motion(rig, [{ transform: 'rotate(-1.2deg)' }, { transform: 'rotate(1.2deg)' }], {
        duration: 2100,
      }),
      motion(
        runner,
        [
          { transform: 'translateX(0px)', offset: 0 },
          { transform: 'translateX(46px)', offset: 0.3 },
          { transform: 'translateX(92px)', offset: 0.6 },
          { transform: 'translateX(138px)', offset: 0.9 },
          { transform: 'translateX(138px)', offset: 1 },
        ],
        { duration: 3200, direction: 'normal', easing: 'ease-in-out' }
      ),
    ],
  }
}

/**
 * 4. The turn: he takes the control cross himself.
 *
 * The strings run from the bar up to his own shoulders, which is the image the
 * article's "control flow handed to the model" needs. The orbit turns one way
 * only, forever, because a loop that reverses is not a loop.
 *
 * @param {SceneContext} ctx
 * @returns {Scene}
 */
function loop(ctx) {
  /*
   * A plain bar rather than the cross of the `harness` stage, and it has to be
   * read against his own belly: same timber, overlapping the torso. So it is
   * filled light, outlined dark, and long enough to stick out well past both
   * hands. The ends are what make it a held object instead of a belt.
   */
  const cross = pivot('100px 170px', [
    s('rect', {
      x: 38,
      y: 166,
      width: 124,
      height: 8,
      rx: 4,
      fill: ctx.colors.light,
      stroke: ctx.woodDark,
      'stroke-width': 1.8,
    }),
    s('rect', { x: 96.5, y: 154, width: 7, height: 16, rx: 3.5, fill: ctx.woodDark }),
  ])

  // Up from the bar's ends, past the head, and back to his own shoulders.
  const selfStrings = s('path', {
    d: 'M46 166 Q34 104 74 116 M154 166 Q166 104 126 116',
    stroke: '#9AA0A8',
    'stroke-width': 1.6,
    'stroke-dasharray': '3 4',
    fill: 'none',
  })

  const orbit = pivot('100px 130px', [
    s('path', {
      d: 'M100 22 A 84 108 0 1 1 32 176',
      stroke: ROSE,
      'stroke-width': 2,
      fill: 'none',
      'stroke-dasharray': '7 6',
      opacity: 0.75,
    }),
    arrowHead(32, 176, 118, ROSE, 8),
  ])

  return {
    behind: [orbit],
    front: [selfStrings, cross],
    motions: [
      motion(orbit, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
        duration: 9000,
        direction: 'normal',
        easing: 'linear',
      }),
      motion(
        cross,
        [
          { transform: 'rotate(-2.5deg) translateY(1px)' },
          { transform: 'rotate(2.5deg) translateY(-2px)' },
        ],
        { duration: 1180 }
      ),
    ],
  }
}

/**
 * 5. One turn of the loop: perceive, reason, act, observe.
 *
 * Four lanterns in a ring, lighting in order. The fourth leg is drawn solid and
 * in accent while the other three are dashed, because observation is the one
 * that closes the circle: without it the ring is a queue.
 *
 * @param {SceneContext} ctx
 * @returns {Scene}
 */
function cycle(ctx) {
  const nodes = [
    { x: 32, y: 66 },
    { x: 168, y: 66 },
    { x: 176, y: 186 },
    { x: 24, y: 186 },
  ]

  // The three forward legs, then the return leg drawn differently.
  const legs = [
    s('path', {
      d: 'M46 62 Q100 44 154 62',
      stroke: LINE,
      'stroke-width': 1.8,
      'stroke-dasharray': '4 5',
      fill: 'none',
    }),
    s('path', {
      d: 'M176 80 Q186 132 176 172',
      stroke: LINE,
      'stroke-width': 1.8,
      'stroke-dasharray': '4 5',
      fill: 'none',
    }),
    s('path', {
      d: 'M162 192 Q100 210 38 192',
      stroke: LINE,
      'stroke-width': 1.8,
      'stroke-dasharray': '4 5',
      fill: 'none',
    }),
  ]

  const returnLeg = s('g', null, [
    s('path', {
      d: 'M20 172 Q8 120 24 80',
      stroke: ROSE,
      'stroke-width': 2.4,
      fill: 'none',
      'stroke-linecap': 'round',
    }),
    arrowHead(25, 78, -72, ROSE, 7),
  ])

  const glyphs = nodes.map(({ x, y }, index) => {
    if (index === 0) {
      // An eye: perceive.
      return s('g', null, [
        s('path', { d: `M${x - 6} ${y} q6 -5 12 0 q-6 5 -12 0`, fill: '#FFFFFF' }),
        s('circle', { cx: x, cy: y, r: 2, fill: INK }),
      ])
    }
    if (index === 1) {
      // A small network: reason.
      return s('path', {
        d: `M${x - 5} ${y + 4} L${x} ${y - 5} L${x + 5} ${y + 4} M${x - 5} ${y + 4} h10`,
        stroke: '#FFFFFF',
        'stroke-width': 1.8,
        fill: 'none',
        'stroke-linejoin': 'round',
      })
    }
    if (index === 2) {
      // A bolt: act.
      return s('path', { d: `M${x + 2} ${y - 6} L${x - 4} ${y + 1} h5 l-2 6 l7 -8 h-5 z`, fill: '#FFFFFF' })
    }
    // A curved arrow: observe.
    return s('g', null, [
      s('path', {
        d: `M${x - 5} ${y + 3} a6 6 0 1 1 8 -4`,
        stroke: '#FFFFFF',
        'stroke-width': 1.8,
        fill: 'none',
        'stroke-linecap': 'round',
      }),
      arrowHead(x + 3, y - 1, -50, '#FFFFFF', 4),
    ])
  })

  const discs = nodes.map(({ x, y }) => s('circle', { cx: x, cy: y, r: 12, fill: ctx.colors.shade }))

  const halos = nodes.map(({ x, y }) =>
    s('circle', {
      cx: x,
      cy: y,
      r: 15,
      fill: 'none',
      stroke: ROSE,
      'stroke-width': 2.5,
      opacity: 0,
      filter: `url(#${ctx.gradientId})`,
    })
  )

  return {
    behind: [...legs, returnLeg, ...discs, ...glyphs, ...halos],
    motions: chase(halos, 620),
    figureTransform: 'translate(20, 24) scale(0.8)',
  }
}

/**
 * 6. Four ways out of a turn.
 *
 * Final answer, tool call, handoff, continued thought. The handoff branch ends
 * in a second small puppet rather than in an icon, because that is the only one
 * of the four where the work changes hands.
 *
 * @param {SceneContext} ctx
 * @returns {Scene}
 */
function decisions(ctx) {
  const branches = litTrail(
    [
      'M112 128 Q136 100 152 76',
      'M116 142 Q142 138 166 130',
      'M114 156 Q140 174 154 186',
      'M92 126 Q68 100 50 82',
    ],
    620,
    ROSE
  )

  // A door standing open: the run is over and he walks out of it.
  const door = s('g', null, [
    s('rect', {
      x: 142,
      y: 46,
      width: 22,
      height: 34,
      rx: 2,
      fill: PAPER,
      stroke: ctx.woodDark,
      'stroke-width': 2,
    }),
    s('path', { d: 'M164 46 l10 -5 v34 l-10 5 z', fill: FLAME, opacity: 0.5 }),
    s('circle', { cx: 147, cy: 64, r: 1.8, fill: ctx.woodDark }),
  ])

  // The lantern, which this deck and the first one both already use for a tool.
  const lantern = pivot('172px 122px', [
    s('line', { x1: 172, y1: 112, x2: 172, y2: 122, stroke: ctx.colors.shade, 'stroke-width': 2 }),
    s('rect', { x: 162, y: 122, width: 20, height: 20, rx: 4, fill: FLAME }),
    s('rect', { x: 167, y: 127, width: 10, height: 10, rx: 2, fill: '#FFF3D6' }),
  ])

  // A second, smaller puppet: the specialist the work is handed to.
  const other = pivot('162px 202px', [
    s('rect', { x: 154, y: 182, width: 16, height: 15, rx: 5, fill: ctx.wood }),
    s('circle', { cx: 159, cy: 188, r: 1.6, fill: INK }),
    s('circle', { cx: 165, cy: 188, r: 1.6, fill: INK }),
    s('path', { d: 'M170 190 l7 2 l-7 2 z', fill: ctx.colors.shade }),
    s('rect', { x: 156, y: 197, width: 12, height: 14, rx: 3, fill: ctx.wood }),
    s('path', {
      d: 'M158 211 l-2 9 M166 211 l2 9',
      stroke: ctx.colors.shade,
      'stroke-width': 3,
      'stroke-linecap': 'round',
    }),
  ])

  // A thought bubble: a turn that is only reasoning, and leads nowhere yet.
  const thought = pivot('40px 74px', [
    s('circle', { cx: 60, cy: 96, r: 2.5, fill: LINE }),
    s('circle', { cx: 53, cy: 88, r: 3.5, fill: LINE }),
    s('ellipse', { cx: 34, cy: 70, rx: 22, ry: 16, fill: PAPER, stroke: LINE, 'stroke-width': 1.4 }),
    s('path', {
      d: 'M24 76 L30 62 L36 76 M24 76 h12',
      stroke: ctx.spark,
      'stroke-width': 1.8,
      fill: 'none',
      'stroke-linejoin': 'round',
    }),
    s('circle', { cx: 44, cy: 70, r: 2.4, fill: ctx.spark }),
  ])

  return {
    behind: branches.nodes,
    front: [door, lantern, other, thought],
    motions: [
      ...branches.motions,
      motion(
        other,
        [
          { transform: 'translateY(0) scale(1, 1)' },
          { transform: 'translateY(-4px) scale(0.97, 1.04)' },
        ],
        { duration: 720 }
      ),
      motion(lantern, [{ transform: 'rotate(-7deg)' }, { transform: 'rotate(8deg)' }], {
        duration: 900,
        delay: -180,
      }),
      motion(
        thought,
        [
          { transform: 'translateY(2px) scale(0.97)' },
          { transform: 'translateY(-3px) scale(1.03)' },
        ],
        { duration: 1600 }
      ),
    ],
    figureTransform: 'translate(6, 22) scale(0.8)',
  }
}

/**
 * 7. ReAct: the cricket keeps the diary.
 *
 * The lines are written one after another and the page never resets, so the
 * trace reads as an accumulating record. That is exactly what the pattern
 * produces, and it is why the block beside this slide is a log and not a table.
 *
 * @param {SceneContext} ctx
 * @returns {Scene}
 */
function react(ctx) {
  const page = sheet({ x: 8, y: 88, width: 78, height: 108, rows: 6, tilt: -3 })

  // The cricket sits on the top corner of the page, not on the puppet's cheek,
  // with the quill in front of him so it is clear who is writing.
  const scribe = cricket(24, 80, 9)

  const quill = pivot('44px 96px', [
    s('path', {
      d: 'M44 96 L58 70',
      stroke: ctx.colors.shade,
      'stroke-width': 3,
      'stroke-linecap': 'round',
    }),
    s('path', { d: 'M58 70 q10 -11 5 -19 q-12 6 -12 17 z', fill: FLAME }),
  ])

  return {
    behind: [page.group],
    front: [scribe, quill],
    motions: [
      // Written, not chased: the page has to fill up.
      ...write(page.rows, 620),
      motion(
        page.group,
        [
          { transform: 'translateY(2px) rotate(-1deg)' },
          { transform: 'translateY(-2px) rotate(1deg)' },
        ],
        { duration: 1700 }
      ),
      motion(
        scribe,
        [
          { transform: 'translateY(0px) scale(1, 1)' },
          { transform: 'translateY(-5px) scale(0.95, 1.05)' },
        ],
        { duration: 520 }
      ),
      motion(quill, [{ transform: 'rotate(-9deg)' }, { transform: 'rotate(7deg)' }], {
        duration: 560,
      }),
    ],
    figureTransform: 'translate(48, 18) scale(0.78)',
  }
}

/**
 * 8. Guardrails: three gates, a cricket on each.
 *
 * Input, every tool, and the final answer. The middle arch carries a padlock
 * because that is the gate the article treats as non-negotiable, and the nose is
 * long on this stage: the one limit nobody can hide.
 *
 * @param {SceneContext} ctx
 * @returns {Scene}
 */
function gates(ctx) {
  const centers = [40, 100, 160]

  const arches = centers.map((cx) =>
    s('path', {
      d: `M${cx - 24} 230 L${cx - 24} 198 Q${cx} 176 ${cx + 24} 198 L${cx + 24} 230`,
      stroke: ctx.wood,
      'stroke-width': 5,
      fill: 'none',
      'stroke-linecap': 'round',
    })
  )

  const padlock = pivot('100px 212px', [
    s('path', {
      d: 'M94 206 a6 6 0 0 1 12 0 v4',
      stroke: ctx.woodDark,
      'stroke-width': 2.2,
      fill: 'none',
    }),
    s('rect', { x: 91, y: 209, width: 18, height: 14, rx: 3, fill: FLAME }),
    s('circle', { cx: 100, cy: 216, r: 2.2, fill: ctx.woodDark }),
  ])

  const guards = [cricket(40, 190, 7), cricket(100, 168, 7), cricket(160, 190, 7)]

  return {
    behind: arches,
    front: [padlock, ...guards],
    motions: guards.map((guard, index) =>
      motion(
        guard,
        [
          { transform: 'translateY(0px) scale(1, 1)' },
          { transform: 'translateY(-7px) scale(0.94, 1.06)' },
        ],
        { duration: 470, delay: -index * 160 }
      )
    ),
    figureTransform: 'translate(28, 4) scale(0.72)',
  }
}

/**
 * 9. Compounding error: a bridge of planks.
 *
 * Every plank holds on its own. The far ones are drawn cracked and fading, which
 * is the multiplication in the article made visible: the chain does not fail at
 * a step, it fails at its length.
 *
 * @param {SceneContext} ctx
 * @returns {Scene}
 */
function chain(ctx) {
  const planks = [0, 1, 2, 3, 4, 5, 6].map((index) => {
    const x = 14 + index * 26
    // Confidence decays down the bridge, and the drawing decays with it.
    const opacity = Math.max(0.22, 1 - index * 0.13)
    return pivot(`${x + 11}px 214px`, [
      s('rect', { x, y: 210, width: 22, height: 7, rx: 2, fill: ctx.wood, opacity }),
      index > 2
        ? s('path', {
            d: `M${x + 8} 210 l3 3.5 -3 3.5`,
            stroke: ctx.woodDark,
            'stroke-width': 1.4,
            fill: 'none',
            opacity,
          })
        : null,
    ])
  })

  // The bindings, under the deck. Above it they cut straight through his shins.
  const ropes = s('path', {
    d: 'M8 220 Q100 213 192 220',
    stroke: LINE,
    'stroke-width': 1.4,
    fill: 'none',
    opacity: 0.7,
  })

  return {
    behind: [waves(228), ropes, ...planks],
    motions: planks.map((plank, index) =>
      motion(
        plank,
        [
          { transform: `rotate(${-0.5 - index * 0.7}deg) translateY(0px)` },
          { transform: `rotate(${0.5 + index * 0.7}deg) translateY(${index * 0.5}px)` },
        ],
        { duration: 1500 - index * 90, delay: -index * 180 }
      )
    ),
    figureTransform: 'translate(-22, 32) scale(0.8)',
  }
}

/**
 * 10. The harness: the bench does half the work.
 *
 * A list nailed up before any carving starts, a sheet of progress that survives
 * the session, and a rope tied back to the bench so there is always a way home.
 * Those are the three structures from the Anthropic experiment, as furniture.
 *
 * @param {SceneContext} ctx
 * @returns {Scene}
 */
function workshop(ctx) {
  const bench = s('g', null, [
    s('rect', { x: 0, y: 212, width: 200, height: 9, rx: 3, fill: ctx.wood }),
    s('rect', { x: 18, y: 221, width: 8, height: 19, fill: ctx.colors.shade }),
    s('rect', { x: 174, y: 221, width: 8, height: 19, fill: ctx.colors.shade }),
  ])

  /*
   * Drawn at full strength and driven to zero by the write loop, not the other
   * way round. Under prefers-reduced-motion nothing animates, and a checklist
   * whose resting state is "no items done" would be saying the opposite of what
   * this scene is about.
   */
  const ticks = [0, 1, 2, 3].map((index) =>
    s('path', {
      d: `M14 ${60 + index * 14} l4 4 l7 -8`,
      stroke: LEAF,
      'stroke-width': 2,
      fill: 'none',
      'stroke-linecap': 'round',
    })
  )

  const board = pivot('34px 78px', [
    s('rect', { x: 6, y: 44, width: 56, height: 66, rx: 4, fill: PAPER, stroke: ctx.woodDark, 'stroke-width': 2 }),
    ...[0, 1, 2, 3].map((index) =>
      s('path', {
        d: `M29 ${62 + index * 14} h26`,
        stroke: LINE,
        'stroke-width': 1.6,
        'stroke-linecap': 'round',
      })
    ),
    ...ticks,
  ])

  const progress = sheet({ x: 148, y: 52, width: 46, height: 60, rows: 4, tilt: 4 })
  const pin = s('circle', { cx: 171, cy: 54, r: 3.4, fill: ROSE })

  const rope = s('path', {
    d: 'M112 176 Q152 200 178 218',
    stroke: FLAME,
    'stroke-width': 2.4,
    fill: 'none',
    'stroke-linecap': 'round',
    style: { transformBox: 'view-box', transformOrigin: '178px 218px' },
  })

  return {
    behind: [bench, board, progress.group, pin],
    front: [rope],
    motions: [
      // Ticked off in order and left ticked: a checklist that only ever shows one
      // item done is not a checklist.
      ...write(ticks, 700),
      motion(
        progress.group,
        [{ transform: 'rotate(-1.5deg)' }, { transform: 'rotate(1.5deg)' }],
        { duration: 2000 }
      ),
      motion(rope, [{ transform: 'rotate(-1.6deg)' }, { transform: 'rotate(1.6deg)' }], {
        duration: 1600,
      }),
    ],
    figureTransform: 'translate(6, 6) scale(0.92)',
  }
}

/**
 * 11. The wrong tool: a painted rail on one side, open sea on the other.
 *
 * The signpost has no words on it because the choice is not a label, it is the
 * shape of the ground: one side is measured out in advance, the other is not.
 *
 * @param {SceneContext} ctx
 * @returns {Scene}
 */
function crossroads(ctx) {
  /*
   * He stands on the left, at the fork. The signpost is off to his right rather
   * than under him: at this scale a post through the middle of the composition
   * lands on his shins and both boards read as belt buckles.
   */
  const rail = s('g', null, [
    s('path', { d: 'M56 158 L6 204', stroke: RAIL, 'stroke-width': 5, 'stroke-linecap': 'round' }),
    ...[0, 1, 2].map((index) =>
      s('path', {
        d: `M${46 - index * 15} ${167 + index * 14} l-8 6`,
        stroke: RAIL,
        'stroke-width': 2.2,
        'stroke-linecap': 'round',
      })
    ),
  ])

  const sea = s('g', null, [
    s('path', {
      d: 'M70 160 Q132 180 198 192',
      stroke: WATER,
      'stroke-width': 4,
      fill: 'none',
      'stroke-linecap': 'round',
      opacity: 0.5,
    }),
    waves(212),
  ])

  const signpost = pivot('149px 176px', [
    s('rect', { x: 146, y: 108, width: 6, height: 68, rx: 2, fill: ctx.woodDark }),
    // Grey pennant back toward the rail, accent pennant out to sea.
    s('path', { d: 'M146 118 L120 118 L112 123 L120 128 L146 128 Z', fill: RAIL }),
    s('path', { d: 'M152 138 L180 138 L188 143 L180 148 L152 148 Z', fill: ROSE }),
  ])

  return {
    behind: [rail, sea],
    front: [signpost],
    motions: [
      motion(signpost, [{ transform: 'rotate(-2deg)' }, { transform: 'rotate(2deg)' }], {
        duration: 1900,
      }),
      motion(sea, [{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }], {
        duration: 2400,
      }),
    ],
    figureTransform: 'translate(-26, -30) scale(0.82)',
  }
}

/**
 * 12. The whole arc, as four steps up.
 *
 * A log that talks, the same log with a lantern, the puppet on a painted rail,
 * the puppet holding its own cross. He stands on the top one, which is the only
 * step in the deck he reached by deciding to.
 *
 * @param {SceneContext} ctx
 * @returns {Scene}
 */
function arc(ctx) {
  /*
   * The run is tight rather than sprawling so the top tread lands under the
   * figure's feet. It is worth the fiddliness: a puppet standing next to the
   * step he is meant to be standing on undoes the whole image.
   */
  const TREAD = 54
  const steps = [
    { x: 8, y: 216 },
    { x: 40, y: 190 },
    { x: 72, y: 164 },
    { x: 104, y: 138 },
  ]

  const treads = steps.map(({ x, y }) =>
    s('rect', { x, y, width: TREAD, height: 8, rx: 3, fill: ctx.wood })
  )

  const lights = steps.map(({ x, y }) =>
    s('rect', {
      x,
      y,
      width: TREAD,
      height: 8,
      rx: 3,
      fill: ROSE,
      opacity: 0,
      filter: `url(#${ctx.gradientId})`,
    })
  )

  /*
   * An emblem above each of the first three steps: a log that talks, the lantern
   * that was added to it, the rail it was walked along. The fourth step has no
   * emblem because the figure is standing on it, holding its own bar. Drawing one
   * there put a control cross across his shins.
   */
  const emblems = [
    s('rect', { x: 21, y: 204, width: 24, height: 9, rx: 4, fill: ctx.colors.shade }),
    s('g', null, [
      s('rect', { x: 54, y: 174, width: 13, height: 13, rx: 2, fill: FLAME }),
      s('rect', { x: 57, y: 177, width: 7, height: 7, rx: 1, fill: '#FFF3D6' }),
    ]),
    s('g', null, [
      s('rect', { x: 78, y: 152, width: 42, height: 3.5, rx: 1.75, fill: RAIL }),
      ...[82, 96, 110].map((cx) =>
        s('circle', { cx, cy: 153.75, r: 3, fill: '#FFFFFF', stroke: RAIL, 'stroke-width': 1.6 })
      ),
    ]),
  ]

  return {
    behind: [...treads, ...lights, ...emblems],
    motions: chase(lights, 700),
    figureTransform: 'translate(70, 6) scale(0.6)',
  }
}

/* ------------------------------- the table -------------------------------- */

/**
 * @type {Readonly<Record<string, (ctx: SceneContext) => Scene>>}
 */
const SCENES = Object.freeze({
  stateless,
  augmented,
  workflow,
  loop,
  cycle,
  decisions,
  react,
  gates,
  chain,
  workshop,
  crossroads,
  arc,
})

/**
 * Every stage this module can draw, in narrative order.
 *
 * Exported so ui/puppet.js can fold it into PUPPET_STAGES without repeating the
 * list, which keeps the "a typo'd stage name fails loudly" test honest.
 *
 * @type {ReadonlyArray<string>}
 */
export const AGENTIC_STAGES = Object.freeze(Object.keys(SCENES))

/**
 * @param {string} stage
 * @param {SceneContext} ctx
 * @returns {Scene | null} null when the stage has no agentic scenery.
 */
export function sceneFor(stage, ctx) {
  const build = SCENES[stage]
  return build ? build(ctx) : null
}
