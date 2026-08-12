// @ts-check
/**
 * The wooden puppet that carries the keynote.
 *
 * One figure, rebuilt per slide with a different `stage`. Because the outer
 * <svg> element is the FLIP morph target and keeps a stable viewBox, the figure
 * appears to transform in place rather than cross-fade: the head that was small
 * and off to one side flies and grows into the next composition.
 *
 * Every stage also breathes on its own. The idle loop is deliberately
 * Scribblenauts-like: nothing translates in a straight line, everything squashes
 * and stretches around a planted origin, and each limb runs on its own period so
 * the figure never falls into a single mechanical beat. That is why the parts
 * are wrapped in <g> elements here rather than drawn flat — a group is the only
 * thing an SVG transform can be anchored to.
 *
 * Purely illustrative, so the narration lives in the slide text and the whole
 * thing is aria-hidden.
 */

import { s } from '../lib/dom.js'
import { prefersReducedMotion } from './flip.js'
import { sceneFor } from './puppet-scenes.js'

/**
 * Every figure the puppet can be, in narrative order.
 *
 * Exported as data, not only as a type, because three separate content files
 * (data/keynote.js, data/keynote-agentic.js and data/glossary.js) name these by
 * string. A typo there would draw the fallback figure silently; the tests
 * compare against this list so it fails loudly instead.
 *
 * The second half of the list belongs to the agentic track and is drawn by
 * ui/puppet-scenes.js. It is spelled out here rather than spread in from that
 * module so this stays the one place a stage name is declared.
 *
 * @type {ReadonlyArray<PuppetStage>}
 */
export const PUPPET_STAGES = Object.freeze([
  'wood',
  'brain',
  'tokens',
  'named',
  'purpose',
  'soul',
  'personality',
  'guardrails',
  'harness',
  'tools',
  'knowledge',
  'memory',
  'export',
  'boy',
  'stateless',
  'augmented',
  'workflow',
  'loop',
  'cycle',
  'decisions',
  'react',
  'gates',
  'chain',
  'workshop',
  'crossroads',
  'arc',
])

/**
 * @typedef {'wood' | 'brain' | 'tokens' | 'named' | 'purpose' | 'soul'
 *   | 'personality' | 'guardrails' | 'harness' | 'tools' | 'knowledge'
 *   | 'memory' | 'export' | 'boy' | 'stateless' | 'augmented' | 'workflow'
 *   | 'loop' | 'cycle' | 'decisions' | 'react' | 'gates' | 'chain'
 *   | 'workshop' | 'crossroads' | 'arc'} PuppetStage
 */

const WOOD_DARK = '#8A5524'
const WOOD = '#C08447'
const WOOD_LIGHT = '#E0AE79'
const SKIN = '#F3C9A2'
const SKIN_DARK = '#D89F73'
const SPARK = '#4C6FE8'

/** Stages where the figure is flesh rather than timber. */
const REAL_BOY = new Set(['export', 'boy'])

/**
 * Stages drawn before Gepeto put a hat on him. The two agentic ones are here
 * for the same reason as `wood` and `brain`: they are about the raw model, and a
 * hat would say someone had already started shaping it.
 */
const BARE_HEAD = new Set(['wood', 'brain', 'stateless', 'augmented'])

/**
 * Stages where the marionette is still on strings.
 *
 * The agentic track hangs him for its first three scenes and then never again:
 * `loop` is where he takes the cross himself, and from there the strings would
 * contradict the story. `workflow` and `loop` draw their own rigs in
 * ui/puppet-scenes.js, so they are deliberately absent here.
 */
const ON_STRINGS = new Set([
  'wood',
  'brain',
  'tokens',
  'named',
  'purpose',
  'harness',
  'stateless',
  'augmented',
])

/**
 * Every idle animation started for a figure, so the keynote can cancel them all
 * when the slide it belongs to is swapped out. Without this, each discarded
 * figure would keep an infinite animation alive for the life of the dialog.
 * @type {WeakMap<Element, Animation[]>}
 */
const running = new WeakMap()

/** Stages where the lie is showing. */
const LYING = new Set(['guardrails', 'gates'])

/**
 * The nose length per stage. Growing it on the Guard Rails slide is the whole
 * point of the analogy: a limit you cannot hide. The agentic track reuses it on
 * `gates`, where the same image has to carry three checkpoints instead of one.
 * @param {PuppetStage} stage
 * @returns {number}
 */
function noseLength(stage) {
  if (stage === 'wood') return 0
  if (LYING.has(stage)) return 62
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
 * A group that exists to be transformed.
 *
 * `transform-box: view-box` is what makes the origin below read in viewBox
 * units instead of the group's own bounding box, so an arm can pivot at the
 * shoulder even though the shoulder is not the centre of the arm.
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
 * @typedef {Object} IdleOptions
 * @property {number} duration Milliseconds for one half-cycle.
 * @property {number} [delay] Negative values start the loop mid-flight.
 * @property {PlaybackDirection} [direction] Defaults to alternate. The agentic
 *   scenes need `normal` for anything that travels: a pulse that runs the loop
 *   backwards on every other pass reads as indecision, not as a cycle.
 * @property {string} [easing] Defaults to ease-in-out.
 */

/**
 * Register one looping animation, by default alternating between two poses.
 * @param {Element} host The figure the animation belongs to.
 * @param {Element | null} target
 * @param {Keyframe[]} keyframes
 * @param {IdleOptions} options
 * @returns {void}
 */
function idle(host, target, keyframes, options) {
  if (!target || typeof target.animate !== 'function') return

  const animation = target.animate(keyframes, {
    duration: options.duration,
    delay: options.delay ?? 0,
    iterations: Infinity,
    direction: options.direction ?? 'alternate',
    easing: options.easing ?? 'ease-in-out',
  })

  const list = running.get(host)
  if (list) list.push(animation)
  else running.set(host, [animation])
}

/**
 * Cancel a figure's idle loops. Safe to call on an element that has none.
 * @param {Element} el
 * @returns {void}
 */
export function stopPuppet(el) {
  const list = running.get(el)
  if (!list) return
  for (const animation of list) animation.cancel()
  running.delete(el)
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

  /* ---------------------------- the drawing ---------------------------- */

  const strings = ON_STRINGS.has(stage)
    ? pivot('100px 0', [
        // The control cross, drawn only where the point is the rig itself.
        stage === 'harness'
          ? s('rect', { x: 58, y: 10, width: 84, height: 7, rx: 3.5, fill: WOOD_DARK })
          : null,
        stage === 'harness'
          ? s('rect', { x: 96.5, y: 0, width: 7, height: 30, rx: 3.5, fill: WOOD })
          : null,
        ...[78, 122].map((x) =>
          s('line', {
            x1: x,
            y1: stage === 'harness' ? 16 : 0,
            x2: x,
            y2: 62,
            stroke: '#C9CDD4',
            'stroke-width': 1.5,
            'stroke-dasharray': '3 4',
          })
        ),
      ])
    : REAL_BOY.has(stage)
      ? // Cut strings, drawn slack, to show he is on his own now.
        pivot('100px 26px', [
          s('path', {
            d: 'M62 26 q6 10 0 20 M138 26 q-6 10 0 20',
            stroke: '#D8DCE3',
            'stroke-width': 1.5,
            fill: 'none',
          }),
        ])
      : null

  const noseGroup = pivot('100px 106px', [
    // A wedge pointing right, its length driven by the stage.
    s('path', { d: `M100 100 L${100 + nose} 106 L100 112 Z`, fill: colors.shade }),
  ])

  const head = pivot('100px 126px', [
    !BARE_HEAD.has(stage)
      ? s('path', {
          d: 'M70 66 Q100 34 130 66 Z',
          fill: stage === 'personality' ? '#E1306C' : colors.shade,
        })
      : null,
    !BARE_HEAD.has(stage) ? s('ellipse', { cx: 100, cy: 67, rx: 34, ry: 5, fill: colors.shade }) : null,

    stage === 'wood'
      ? // Before anything is carved it is a plain block of timber.
        s('rect', { x: 74, y: 68, width: 52, height: 56, rx: 4, fill: colors.body })
      : s('rect', { x: 74, y: 68, width: 52, height: 58, rx: 18, fill: colors.body }),

    // Grain, only while it is still plain wood.
    !REAL_BOY.has(stage) && stage !== 'brain'
      ? s('path', {
          d: 'M82 84 Q100 90 118 84 M82 100 Q100 106 118 100',
          stroke: colors.light,
          'stroke-width': 1.5,
          fill: 'none',
          opacity: 0.7,
        })
      : null,

    stage !== 'wood' ? s('circle', { cx: 89, cy: 96, r: 4, fill: '#1B1B1F' }) : null,
    stage !== 'wood' ? s('circle', { cx: 111, cy: 96, r: 4, fill: '#1B1B1F' }) : null,

    // Raised brows on the personality slide read as "curious".
    stage === 'personality'
      ? s('path', {
          d: 'M84 86 Q89 82 94 86 M106 86 Q111 82 116 86',
          stroke: '#1B1B1F',
          'stroke-width': 2,
          fill: 'none',
          'stroke-linecap': 'round',
        })
      : null,

    stage !== 'wood' ? noseGroup : null,

    stage !== 'wood'
      ? s('path', {
          d: stage === 'guardrails' ? 'M90 118 Q100 114 110 118' : 'M90 116 Q100 122 110 116',
          stroke: '#1B1B1F',
          'stroke-width': 2,
          fill: 'none',
          'stroke-linecap': 'round',
        })
      : null,
  ])

  // The model, drawn as a lit network inside the head: it is already there
  // before any of the nine steps touch it.
  const brain =
    stage === 'brain'
      ? pivot('100px 82px', [
          // The links are drawn unblurred: at this size the glow filter turns
          // thin strokes into a smudge, and the network has to stay legible.
          s('path', {
            d: 'M84 80 L100 72 L116 80 M84 80 L92 90 L108 90 L116 80 M92 90 L100 72 L108 90',
            stroke: SPARK,
            'stroke-width': 1.6,
            fill: 'none',
            opacity: 0.8,
          }),
          ...[
            [100, 72],
            [84, 80],
            [116, 80],
            [92, 90],
            [108, 90],
          ].map(([cx, cy]) =>
            s('circle', { cx, cy, r: 3, fill: SPARK, filter: `url(#${gradientId})` })
          ),
        ])
      : null

  // Speech, cut into pieces: what leaves the mouth is never a whole sentence.
  const tokenColors = ['#E1306C', '#FCAF45', '#7C3AED', '#2FA36B']
  const tokens =
    stage === 'tokens'
      ? tokenColors.map((fill, index) =>
          s('rect', {
            x: 132 + index * 17,
            y: index % 2 === 0 ? 110 : 102,
            width: 14,
            height: 10,
            rx: 3,
            fill,
            style: { transformBox: 'view-box', transformOrigin: `${139 + index * 17}px 110px` },
          })
        )
      : []

  const armLeft = pivot('78px 142px', [
    s('path', {
      d: 'M78 142 L56 162',
      stroke: colors.shade,
      'stroke-width': 9,
      'stroke-linecap': 'round',
      fill: 'none',
    }),
  ])

  const lantern =
    stage === 'tools'
      ? // A lantern in hand: what he needs to get out of the whale.
        pivot('144px 162px', [
          s('line', { x1: 144, y1: 162, x2: 144, y2: 176, stroke: colors.shade, 'stroke-width': 2 }),
          s('rect', { x: 133, y: 176, width: 22, height: 22, rx: 4, fill: '#FCAF45' }),
          s('rect', { x: 138, y: 181, width: 12, height: 12, rx: 2, fill: '#FFF3D6' }),
        ])
      : null

  const armRight = pivot('122px 142px', [
    s('path', {
      d: 'M122 142 L144 162',
      stroke: colors.shade,
      'stroke-width': 9,
      'stroke-linecap': 'round',
      fill: 'none',
    }),
    lantern,
  ])

  const legs = pivot('100px 184px', [
    s('path', {
      d: 'M88 184 L84 218 M112 184 L116 218',
      stroke: colors.shade,
      'stroke-width': 9,
      'stroke-linecap': 'round',
      fill: 'none',
    }),
  ])

  const heart =
    stage === 'soul'
      ? pivot('100px 152px', [
          s('path', {
            d: 'M100 168 c-9 -9 -18 -16 -18 -25 a9 9 0 0 1 18 -5 a9 9 0 0 1 18 5 c0 9 -9 16 -18 25 Z',
            fill: '#E1306C',
            filter: `url(#${gradientId})`,
          }),
        ])
      : null

  const cricket =
    stage === 'guardrails'
      ? // Jiminy on the shoulder: the conscience that speaks up.
        pivot('138px 132px', [
          s('circle', { cx: 138, cy: 132, r: 9, fill: '#2FA36B' }),
          s('circle', { cx: 135, cy: 130, r: 2, fill: '#0F2E1E' }),
          s('path', {
            d: 'M144 126 l8 -7 M144 132 l9 -1',
            stroke: '#2FA36B',
            'stroke-width': 2,
            'stroke-linecap': 'round',
          }),
        ])
      : null

  const book =
    stage === 'memory'
      ? // A book of everything the adventures taught him.
        pivot('57px 170px', [
          s('rect', { x: 42, y: 158, width: 30, height: 24, rx: 3, fill: '#7C3AED' }),
          s('path', {
            d: 'M57 158 v24 M46 165 h8 M60 165 h8',
            stroke: '#E6DCFF',
            'stroke-width': 1.5,
          }),
        ])
      : null

  /*
   * The schoolbook Geppetto sold his coat to buy, held open in both hands. It has
   * to read as a different object from the memory book above — that one is closed,
   * purple and on his hip; this one is open, pale and out in front, because the
   * point is that it is being consulted rather than carried.
   */
  const rightPage =
    stage === 'knowledge'
      ? s('path', {
          d: 'M100 150 L138 155 L138 175 L100 171 Z',
          fill: '#FBFAF5',
          stroke: '#C9CDD4',
          'stroke-width': 1.2,
          style: { transformBox: 'view-box', transformOrigin: '100px 161px' },
        })
      : null

  // Held at the hands, which sit at y=162 — low enough to read as held, high
  // enough not to cover the legs.
  const openBook =
    stage === 'knowledge'
      ? pivot('100px 161px', [
          s('path', {
            d: 'M100 150 L62 155 L62 175 L100 171 Z',
            fill: '#FBFAF5',
            stroke: '#C9CDD4',
            'stroke-width': 1.2,
          }),
          rightPage,
          // Lines of text, short enough to read as writing rather than as rules.
          s('path', {
            d: 'M69 161 h24 M69 167 h18 M107 162 h24 M107 168 h18',
            stroke: '#C9CDD4',
            'stroke-width': 1.4,
            'stroke-linecap': 'round',
          }),
          s('path', {
            d: 'M100 150 v21',
            stroke: SPARK,
            'stroke-width': 2.4,
            'stroke-linecap': 'round',
          }),
        ])
      : null

  const star =
    stage === 'purpose'
      ? // Geppetto's wish upon a star.
        pivot('157px 56px', [
          s('path', {
            d: 'M150 44 l5 11 12 2 -9 9 2 12 -10 -6 -10 6 2 -12 -9 -9 12 -2 Z',
            fill: '#FCAF45',
          }),
        ])
      : null

  // Planted at the feet, so the whole body squashes downward instead of
  // shrinking toward its middle.
  const figure = pivot('100px 220px', [
    legs,
    armLeft,
    armRight,
    s('rect', {
      x: 78,
      y: 130,
      width: 44,
      height: 54,
      rx: REAL_BOY.has(stage) ? 14 : 6,
      fill: colors.body,
    }),
    heart,
    head,
    brain,
    ...tokens,
    cricket,
    book,
    openBook,
  ])
  figure.dataset.role = 'figure'

  /*
   * The agentic scenery, if this stage has any.
   *
   * `figureTransform` is a static wrapper rather than a transform on `figure`
   * itself, because `figure` already carries the idle bob and the two would
   * overwrite each other. Nesting works: `transform-box: view-box` resolves
   * against the viewBox, not against the ancestor chain, so the bob still
   * pivots at the feet in local coordinates and the wrapper only maps the
   * result.
   */
  const scene = sceneFor(stage, {
    colors,
    gradientId,
    wood: WOOD,
    woodDark: WOOD_DARK,
    spark: SPARK,
  })

  const body = scene?.figureTransform
    ? s('g', { transform: scene.figureTransform }, figure)
    : figure

  const svg = s(
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
    strings,
    ...(scene?.behind ?? []),
    body,
    ...(scene?.front ?? []),
    star
  )

  /* ----------------------------- the motion ---------------------------- */

  // The CSS prefers-reduced-motion rule cannot reach element.animate(), so the
  // preference has to be honoured here or the figure would keep bouncing for
  // someone who asked the system for stillness.
  if (prefersReducedMotion()) return svg

  // A real boy has more spring in him than a block of timber.
  const alive = REAL_BOY.has(stage)

  idle(
    svg,
    figure,
    [
      { transform: 'translateY(0px) scale(1.025, 0.975)' },
      { transform: `translateY(${alive ? -9 : -6}px) scale(0.985, 1.02)` },
    ],
    { duration: alive ? 620 : 780 }
  )

  idle(svg, head, [{ transform: 'rotate(-3deg)' }, { transform: 'rotate(3.5deg)' }], {
    duration: 1300,
    delay: -420,
  })

  idle(svg, armLeft, [{ transform: 'rotate(-10deg)' }, { transform: 'rotate(7deg)' }], {
    duration: 1120,
  })

  idle(svg, armRight, [{ transform: 'rotate(9deg)' }, { transform: 'rotate(-6deg)' }], {
    duration: 1240,
    delay: -300,
  })

  idle(svg, legs, [{ transform: 'rotate(-1.8deg)' }, { transform: 'rotate(1.8deg)' }], {
    duration: 1660,
    delay: -600,
  })

  idle(svg, strings, [{ transform: 'rotate(-1.2deg)' }, { transform: 'rotate(1.2deg)' }], {
    duration: 2100,
  })

  /*
   * The brain is not sitting there waiting: it is lowered into the head, settles,
   * beats a couple of times and the loop starts over. The slide says the model is
   * something you fit into the figure rather than something you teach it, and a
   * network that merely pulsed in place said the opposite.
   *
   * One infinite animation rather than a one-shot plus a pulse, so `stopPuppet`
   * has a single handle to cancel and a discarded slide leaves nothing running.
   */
  idle(
    svg,
    brain,
    [
      { offset: 0, transform: 'translateY(-46px) scale(0.7)', opacity: 0 },
      { offset: 0.1, transform: 'translateY(-46px) scale(0.7)', opacity: 0.9, easing: 'cubic-bezier(0.55, 0, 0.9, 0.6)' },
      // Lands with a little give, the way something heavy set down does.
      { offset: 0.3, transform: 'translateY(3px) scale(1.12)', opacity: 1, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
      { offset: 0.4, transform: 'translateY(0) scale(1)', opacity: 1 },
      { offset: 0.58, transform: 'translateY(0) scale(1.08)', opacity: 1 },
      { offset: 0.74, transform: 'translateY(0) scale(0.97)', opacity: 1 },
      { offset: 0.88, transform: 'translateY(0) scale(1.04)', opacity: 1 },
      { offset: 0.97, transform: 'translateY(0) scale(1)', opacity: 0 },
      { offset: 1, transform: 'translateY(-46px) scale(0.7)', opacity: 0 },
    ],
    { duration: 3200, direction: 'normal', easing: 'ease-in-out' }
  )

  idle(svg, heart, [{ transform: 'scale(0.92)' }, { transform: 'scale(1.16)' }], { duration: 560 })

  // Each piece leaves on its own beat, so the row reads as a stream rather than
  // as four blocks blinking together.
  tokens.forEach((token, index) => {
    idle(
      svg,
      token,
      [
        { transform: 'translateX(-7px) scale(0.8)', opacity: 0.25 },
        { transform: 'translateX(4px) scale(1)', opacity: 1 },
      ],
      { duration: 700, delay: -index * 175 }
    )
  })

  idle(
    svg,
    cricket,
    [
      { transform: 'translateY(0px) scale(1, 1)' },
      { transform: 'translateY(-8px) scale(0.94, 1.06)' },
    ],
    { duration: 460 }
  )

  idle(svg, lantern, [{ transform: 'rotate(-8deg)' }, { transform: 'rotate(9deg)' }], {
    duration: 940,
    delay: -200,
  })

  idle(
    svg,
    book,
    [
      { transform: 'translateY(3px) rotate(-4deg)' },
      { transform: 'translateY(-4px) rotate(5deg)' },
    ],
    { duration: 1500 }
  )

  idle(
    svg,
    star,
    [
      { transform: 'scale(0.82) rotate(-12deg)' },
      { transform: 'scale(1.14) rotate(14deg)' },
    ],
    { duration: 820 }
  )

  idle(
    svg,
    openBook,
    [
      { transform: 'rotate(-2.5deg) translateY(1px)' },
      { transform: 'rotate(2.5deg) translateY(-2px)' },
    ],
    { duration: 1400 }
  )

  // One page lifting and settling: he is reading it, not holding it for a photo.
  idle(svg, rightPage, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0.72)' }], {
    duration: 1150,
    delay: -400,
  })

  // The lie itself: the nose shoots out once, with a small overshoot, and stays
  // out. It settles on its natural length, so nothing depends on fill modes.
  if (LYING.has(stage) && typeof noseGroup.animate === 'function') {
    noseGroup.animate([{ transform: 'scaleX(0.14)' }, { transform: 'scaleX(1)' }], {
      duration: 520,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      fill: 'backwards',
    })
  }

  // The scenery's own loops, registered here so stopPuppet() reaches them too.
  for (const { target, keyframes, options } of scene?.motions ?? []) {
    idle(svg, target, keyframes, options)
  }

  return svg
}
