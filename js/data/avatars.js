// @ts-check
/**
 * The agent portrait.
 *
 * SPEC 16 originally described a gallery of eight selectable avatars. The
 * product decision is a single fixed identity — the Friendly Bot — so there is
 * exactly one definition here and no picker in the UI. SPEC 102.18 is explicit
 * that unimplemented options must be removed rather than shown and ignored.
 *
 * The catalogue shape is kept (rather than hard-coding one portrait) so
 * restoring a choice later is a data change, not a rewrite.
 */

/**
 * @typedef {Object} AvatarDefinition
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {string} icon
 * @property {[string, string, string]} gradient Three gradient stops.
 */

/** @type {ReadonlyArray<AvatarDefinition>} */
export const AVATARS = Object.freeze([
  {
    id: 'friendly-bot',
    name: 'Friendly Bot',
    category: 'Geral',
    icon: 'bot',
    gradient: ['#7C3AED', '#D946EF', '#FF2D95'],
  },
])

/** The portrait every agent uses. */
export const DEFAULT_AVATAR_ID = 'friendly-bot'

/**
 * Always resolves — an unknown or missing id falls back to the default.
 * @param {string | undefined} id
 * @returns {AvatarDefinition}
 */
export function getAvatar(id) {
  const found = id ? AVATARS.find((avatar) => avatar.id === id) : undefined
  const fallback = AVATARS.find((avatar) => avatar.id === DEFAULT_AVATAR_ID)
  if (!fallback) throw new Error('Default avatar is missing from the catalogue')
  return found ?? fallback
}
