// @ts-check
/**
 * The keynote's content blocks.
 *
 * The first track is pure narration: a figure, a story, a lesson. The agentic
 * track argues instead of tells, and an argument needs shapes the narration does
 * not have: the four workflow patterns are a table, the loop is a ring of steps,
 * ReAct is a log, compounding error is two bars next to each other. Those live
 * here.
 *
 * Two rules hold the set together.
 *
 * The first is that a block is data in data/keynote-agentic.js and geometry
 * here, the same split the slides themselves use. Nothing in this file knows
 * what a workflow is.
 *
 * The second is where the motion goes. One-shot entrances are JS, through
 * playEnter, because they need computed per-element delays and have to be
 * skipped under prefers-reduced-motion. Anything that loops forever is a CSS
 * animation declared in css/keynote-blocks.css, because the global reduce rule
 * in base.css already neutralises those and, unlike element.animate(), a CSS
 * animation on a discarded node holds no reference that would keep it alive.
 */

import { h } from '../lib/dom.js'
import { icon } from '../icons.js'
import { playEnter, prefersReducedMotion } from './flip.js'

/**
 * @typedef {Object} PointsBlock A labelled list. The workhorse.
 * @property {'points'} type
 * @property {string} [caption]
 * @property {ReadonlyArray<{ iconName?: string, label: string, text: string }>} items
 */

/**
 * @typedef {Object} TableBlock
 * @property {'table'} type
 * @property {string} [caption]
 * @property {ReadonlyArray<string>} head
 * @property {ReadonlyArray<ReadonlyArray<string>>} rows
 */

/**
 * @typedef {Object} FlowBlock Steps in a ring, with a pulse running them.
 * @property {'flow'} type
 * @property {string} [caption]
 * @property {ReadonlyArray<string>} steps
 * @property {string} [back] Label for the arrow that returns to the first step.
 */

/**
 * @typedef {Object} TraceBlock A ReAct log.
 * @property {'trace'} type
 * @property {string} [caption]
 * @property {ReadonlyArray<{ kind: TraceKind, text: string }>} rows
 */

/** @typedef {'input' | 'thought' | 'action' | 'observation' | 'final'} TraceKind */

/**
 * @typedef {Object} MeterBlock Bars that grow to a percentage.
 * @property {'meter'} type
 * @property {string} [caption]
 * @property {ReadonlyArray<{ label: string, detail: string, percent: number }>} rows
 */

/**
 * @typedef {Object} CompareBlock Two panels, side by side.
 * @property {'compare'} type
 * @property {string} [caption]
 * @property {ReadonlyArray<{ title: string, iconName: string, items: ReadonlyArray<string> }>} columns
 */

/**
 * @typedef {Object} LadderBlock The progression, as steps up.
 * @property {'ladder'} type
 * @property {string} [caption]
 * @property {ReadonlyArray<{ label: string, adds?: string }>} rungs
 */

/**
 * @typedef {Object} LinksBlock
 * @property {'links'} type
 * @property {string} [caption]
 * @property {ReadonlyArray<{ label: string, source: string, href: string }>} items
 */

/**
 * @typedef {PointsBlock | TableBlock | FlowBlock | TraceBlock | MeterBlock
 *   | CompareBlock | LadderBlock | LinksBlock} KeynoteBlock
 */

/** How each kind of trace row is labelled and marked. */
const TRACE_KINDS = Object.freeze({
  input: { label: 'Entrada', iconName: 'user-round' },
  thought: { label: 'Pensamento', iconName: 'brain' },
  action: { label: 'Ação', iconName: 'wrench' },
  observation: { label: 'Observação', iconName: 'eye' },
  final: { label: 'Resposta final', iconName: 'check' },
})

/**
 * Reveal a list of nodes in sequence.
 *
 * The step is deliberately short. A cascade is meant to say "these belong
 * together and there are several of them", and past about 80ms a reader starts
 * waiting for the last row instead of reading the first.
 *
 * @param {Element[]} nodes
 * @param {{ start?: number, step?: number, distance?: number }} [options]
 * @returns {void}
 */
function revealAll(nodes, options = {}) {
  const { start = 220, step = 60, distance = 10 } = options
  nodes.forEach((node, index) => {
    playEnter(node, { delay: start + index * step, distance })
  })
}

/**
 * @param {string} [text]
 * @returns {HTMLElement | null}
 */
function caption(text) {
  return text ? h('p', { class: 'knote-caption' }, text) : null
}

/* -------------------------------- renderers ------------------------------- */

/**
 * @typedef {Object} RenderedBlock
 * @property {HTMLElement} element
 * @property {Element[]} steps The nodes to reveal, in reading order.
 */

/**
 * @param {PointsBlock} block
 * @returns {RenderedBlock}
 */
function points(block) {
  const items = block.items.map((item) =>
    h(
      'li',
      { class: 'knote-point' },
      h(
        'span',
        { class: 'knote-point__mark', 'aria-hidden': 'true' },
        item.iconName ? icon(item.iconName, { size: 14 }) : null
      ),
      h(
        'span',
        { class: 'knote-point__body' },
        h('span', { class: 'knote-point__label' }, item.label),
        h('span', { class: 'knote-point__text' }, item.text)
      )
    )
  )

  return {
    element: h('div', { class: 'knote knote--points' }, caption(block.caption), h('ul', { class: 'knote-points' }, items)),
    steps: items,
  }
}

/**
 * The app's first real table. Built as a table rather than as a grid because it
 * has a header row that means something, and a screen reader should say so.
 *
 * @param {TableBlock} block
 * @returns {RenderedBlock}
 */
function table(block) {
  const rows = block.rows.map((cells) =>
    h(
      'tr',
      { class: 'knote-table__row' },
      ...cells.map((cell, column) =>
        h('td', { class: column === 0 ? 'knote-table__cell knote-table__cell--lead' : 'knote-table__cell' }, cell)
      )
    )
  )

  const element = h(
    'div',
    { class: 'knote knote--table' },
    caption(block.caption),
    h(
      'div',
      { class: 'knote-table__scroll' },
      h(
        'table',
        { class: 'knote-table' },
        h('thead', null, h('tr', null, ...block.head.map((label) => h('th', { scope: 'col' }, label)))),
        h('tbody', null, ...rows)
      )
    )
  )

  return { element, steps: rows }
}

/**
 * @param {FlowBlock} block
 * @returns {RenderedBlock}
 */
function flow(block) {
  const chips = block.steps.map((step, index) =>
    h(
      'li',
      { class: 'knote-flow__step' },
      h(
        'span',
        {
          class: 'knote-flow__chip',
          // The pulse is one CSS animation shared by every chip, offset per
          // position, which is what makes the light look like it is travelling.
          style: { animationDelay: `${index * 320}ms` },
        },
        step
      ),
      index < block.steps.length - 1
        ? h('span', { class: 'knote-flow__arrow', 'aria-hidden': 'true' }, icon('chevron-right', { size: 13 }))
        : null
    )
  )

  const element = h(
    'div',
    { class: 'knote knote--flow' },
    caption(block.caption),
    h('ol', { class: 'knote-flow' }, ...chips),
    block.back
      ? h(
          'p',
          { class: 'knote-flow__back' },
          icon('rotate-ccw', { size: 13 }),
          block.back
        )
      : null
  )

  return { element, steps: chips }
}

/**
 * @param {TraceBlock} block
 * @returns {RenderedBlock}
 */
function trace(block) {
  const rows = block.rows.map((row) => {
    const kind = TRACE_KINDS[row.kind]
    return h(
      'li',
      { class: 'knote-trace__row', dataset: { kind: row.kind } },
      h(
        'span',
        { class: 'knote-trace__kind' },
        h('span', { class: 'knote-trace__icon', 'aria-hidden': 'true' }, icon(kind.iconName, { size: 13 })),
        kind.label
      ),
      h('span', { class: 'knote-trace__text' }, row.text)
    )
  })

  const element = h(
    'div',
    { class: 'knote knote--trace' },
    caption(block.caption),
    h('ol', { class: 'knote-trace' }, ...rows)
  )

  // Slower than the other blocks on purpose: this one is meant to read as being
  // written, and a log that appears all at once loses the whole point of ReAct.
  return { element, steps: rows }
}

/**
 * @param {MeterBlock} block
 * @returns {RenderedBlock}
 */
function meter(block) {
  const rows = block.rows.map((row) => {
    const fill = h('span', {
      class: 'knote-meter__fill',
      style: { width: `${Math.max(0, Math.min(100, row.percent))}%` },
    })

    // Growing the bar is the argument: the number is not interesting, the drop
    // between the two bars is.
    if (!prefersReducedMotion() && typeof fill.animate === 'function') {
      fill.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
        duration: 760,
        delay: 320,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'backwards',
      })
    }

    return h(
      'li',
      { class: 'knote-meter__row' },
      h(
        'span',
        { class: 'knote-meter__head' },
        h('span', { class: 'knote-meter__label' }, row.label),
        h('span', { class: 'knote-meter__value' }, `${row.percent}%`)
      ),
      h('span', { class: 'knote-meter__track' }, fill),
      h('span', { class: 'knote-meter__detail' }, row.detail)
    )
  })

  return {
    element: h('div', { class: 'knote knote--meter' }, caption(block.caption), h('ul', { class: 'knote-meter' }, ...rows)),
    steps: rows,
  }
}

/**
 * @param {CompareBlock} block
 * @returns {RenderedBlock}
 */
function compare(block) {
  const columns = block.columns.map((column, index) =>
    h(
      'div',
      { class: 'knote-compare__column', dataset: { side: index === 0 ? 'left' : 'right' } },
      h(
        'p',
        { class: 'knote-compare__title' },
        h('span', { class: 'knote-compare__icon', 'aria-hidden': 'true' }, icon(column.iconName, { size: 14 })),
        column.title
      ),
      h(
        'ul',
        { class: 'knote-compare__list' },
        ...column.items.map((item) => h('li', null, item))
      )
    )
  )

  return {
    element: h('div', { class: 'knote knote--compare' }, caption(block.caption), h('div', { class: 'knote-compare' }, ...columns)),
    steps: columns,
  }
}

/**
 * @param {LadderBlock} block
 * @returns {RenderedBlock}
 */
function ladder(block) {
  /** @type {HTMLElement[]} */
  const steps = []

  const rungs = block.rungs.flatMap((rung, index) => {
    /** @type {(HTMLElement | null)[]} */
    const parts = []

    if (rung.adds) {
      // Carries the level of the rung it produces, so CSS can line the "+" up
      // with it. Keyed on the attribute rather than on nth-of-type because rungs
      // and additions are both <p> and the positional count interleaves them.
      const adds = h(
        'p',
        { class: 'knote-ladder__adds', dataset: { level: String(index) } },
        h('span', { class: 'knote-ladder__plus', 'aria-hidden': 'true' }, '+'),
        rung.adds
      )
      steps.push(adds)
      parts.push(adds)
    }

    const rungEl = h(
      'p',
      { class: 'knote-ladder__rung', dataset: { level: String(index) } },
      h('span', { class: 'knote-ladder__label' }, rung.label)
    )
    steps.push(rungEl)
    parts.push(rungEl)

    return parts
  })

  return {
    element: h('div', { class: 'knote knote--ladder' }, caption(block.caption), h('div', { class: 'knote-ladder' }, ...rungs)),
    steps,
  }
}

/**
 * @param {LinksBlock} block
 * @returns {RenderedBlock}
 */
function links(block) {
  const items = block.items.map((item) =>
    h(
      'li',
      { class: 'knote-link' },
      h(
        'a',
        { class: 'knote-link__anchor', href: item.href, target: '_blank', rel: 'noreferrer' },
        h(
          'span',
          { class: 'knote-link__body' },
          h('span', { class: 'knote-link__label' }, item.label),
          h('span', { class: 'knote-link__source' }, item.source)
        ),
        h('span', { class: 'knote-link__go', 'aria-hidden': 'true' }, icon('arrow-right', { size: 14 }))
      )
    )
  )

  return {
    element: h('div', { class: 'knote knote--links' }, caption(block.caption), h('ul', { class: 'knote-links' }, ...items)),
    steps: items,
  }
}

/**
 * How fast each kind of block cascades. Only the trace differs, and it differs
 * because it is the one block whose subject is the passing of time.
 * @type {Readonly<Record<string, { start?: number, step?: number }>>}
 */
const PACE = Object.freeze({
  trace: { start: 240, step: 105 },
})

/** @type {Readonly<Record<string, (block: any) => RenderedBlock>>} */
const RENDERERS = Object.freeze({
  points,
  table,
  flow,
  trace,
  meter,
  compare,
  ladder,
  links,
})

/**
 * Build the block column for a slide.
 *
 * Returns the container plus a `reveal` to call *after* it is in the document.
 * Splitting the two matters: playEnter measures nothing, but an entrance that
 * starts before the node is attached is an entrance nobody sees.
 *
 * @param {ReadonlyArray<KeynoteBlock>} blocks
 * @returns {{ element: HTMLElement, reveal: () => void }}
 */
export function renderBlocks(blocks) {
  /** @type {Array<() => void>} */
  const reveals = []

  const element = h(
    'div',
    { class: 'keynote__blocks' },
    ...blocks.map((block) => {
      const build = RENDERERS[block.type]
      if (!build) return null

      const rendered = build(block)
      const pace = PACE[block.type] ?? {}
      reveals.push(() => revealAll(rendered.steps, pace))
      return rendered.element
    })
  )

  return {
    element,
    reveal: () => {
      for (const run of reveals) run()
    },
  }
}
