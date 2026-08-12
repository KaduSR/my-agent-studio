// @ts-check
/**
 * The hopping figure that sits at a desk.
 *
 * Every agent in this app wears the same portrait: `data/avatars.js` ships one
 * avatar by product decision, so eight desks would otherwise be eight identical
 * bots. The hue is therefore load-bearing rather than decoration, and it is
 * derived from the agent id so the same agent is the same colour on every visit,
 * in every team, with nothing stored to keep in sync.
 *
 * The hop itself is a CSS animation and never `element.animate()`. Two reasons,
 * both already written down elsewhere in this codebase: the global
 * `prefers-reduced-motion` rule in base.css reaches CSS and cannot reach the Web
 * Animations API, and a CSS animation holds no reference to the node it runs on,
 * so a discarded desk cannot keep one alive.
 */

import { h } from '../lib/dom.js'
import { avatarArt } from './avatar-art.js'

/** Hues are picked from a fixed wheel rather than a free 0-359 hash. */
const HUE_BUCKETS = 12
const HUE_STEP = 360 / HUE_BUCKETS

/**
 * A stable hue for an agent.
 *
 * FNV-1a folded into twelve buckets 30 degrees apart. Buckets rather than a raw
 * modulo of 360 because two agents landing 4 degrees apart would read as the
 * same colour and defeat the point; 30 degrees is always a visible difference.
 *
 * @param {string} agentId
 * @returns {number} Degrees, 0 to 330, always a multiple of 30.
 */
export function hueForAgent(agentId) {
  let hash = 2166136261
  for (let i = 0; i < agentId.length; i += 1) {
    hash ^= agentId.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (Math.abs(hash) % HUE_BUCKETS) * HUE_STEP
}

/**
 * Hues for a whole roster, with collisions moved out of the way.
 *
 * `hueForAgent` alone is not enough in a room: four agents drawn from twelve
 * buckets collide about half the time, and two identical bots side by side is
 * exactly the thing the colour exists to prevent. So the id still chooses, and a
 * seat that finds its bucket taken walks to the next free one. Deterministic,
 * stable while the roster is, and distinct up to twelve seats, which is above
 * the roster ceiling.
 *
 * @param {ReadonlyArray<string>} agentIds In seat order.
 * @returns {Map<string, number>}
 */
export function hueMap(agentIds) {
  /** @type {Map<string, number>} */
  const hues = new Map()
  /** @type {Set<number>} */
  const taken = new Set()

  for (const agentId of agentIds) {
    if (hues.has(agentId)) continue

    let hue = hueForAgent(agentId)
    for (let step = 0; step < HUE_BUCKETS && taken.has(hue); step += 1) {
      hue = (hue + HUE_STEP) % 360
    }

    taken.add(hue)
    hues.set(agentId, hue)
  }

  return hues
}

/**
 * @param {Object} config
 * @param {string} config.agentId  Drives the timing jitter, and the colour when
 *   no hue is passed in.
 * @param {string | undefined} config.avatarId
 * @param {number} [config.hue] Degrees, from hueMap, so a roster has no repeats.
 * @param {number} [config.index]  Desk position; staggers the hop.
 * @param {number} [config.size]
 * @returns {HTMLElement}
 */
export function officeSprite({ agentId, avatarId, hue: given, index = 0, size = 48 }) {
  const hue = given ?? hueForAgent(agentId)

  return h(
    'span',
    {
      class: 'sprite',
      /*
       * avatarArt carries role="img" and an aria-label, so eight sprites would
       * announce "Avatar Friendly Bot" eight times. The name beside the desk is
       * the real content; this whole subtree is decoration over it.
       */
      'aria-hidden': 'true',
      /*
       * Custom properties cannot go through the `style` object: applyProps does
       * Object.assign(el.style, …), and assigning style['--sprite-hue'] adds a
       * plain JS property that never reaches the cascade. setProperty is the
       * only way in, hence the ref.
       */
      ref: (/** @type {HTMLElement} */ el) => {
        el.style.setProperty('--sprite-hue', `${hue}deg`)
        // 130ms does not divide the cycle, so a room of agents working
        // separately never accidentally falls into step.
        el.style.setProperty('--sprite-delay', `${index * 130}ms`)
        // Derived from the same hash, so it is deterministic: Math.random() here
        // would make every screenshot and every diff different.
        el.style.setProperty('--sprite-jitter', `${((hue / HUE_STEP) % 5) * 40}ms`)
      },
    },
    h('span', { class: 'sprite__shadow' }),
    h('span', { class: 'sprite__body' }, avatarArt(avatarId, size))
  )
}

/**
 * The stand-in for a desk whose agent was deleted.
 * @returns {HTMLElement}
 */
export function emptySprite() {
  return h(
    'span',
    { class: 'sprite sprite--empty', 'aria-hidden': 'true' },
    h('span', { class: 'sprite__shadow' }),
    h('span', { class: 'sprite__body' })
  )
}
