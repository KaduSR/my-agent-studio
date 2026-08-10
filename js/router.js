// @ts-check
/**
 * Hash router.
 *
 * SPEC 94 defines path-style routes. A static host with no rewrite rules — the
 * GitHub Pages deployment target — would 404 on a deep link like
 * /studio/<uuid>, so the same structure is expressed after the hash. One
 * index.html serves every route, with no server configuration at all.
 */

/**
 * @typedef {Object} RouteMatch
 * @property {string} name
 * @property {Record<string, string>} params
 */

/** @typedef {(match: RouteMatch) => void} RouteHandler */

/**
 * Normalise `location.hash` into a clean path such as `/studio/new`.
 * @param {string} hash
 * @returns {string}
 */
export function normalizeHash(hash) {
  const raw = hash.replace(/^#/, '')
  const path = raw.startsWith('/') ? raw : `/${raw}`
  const trimmed = path.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

/**
 * Match a path against the known routes.
 * @param {string} path
 * @returns {RouteMatch}
 */
export function matchRoute(path) {
  if (path === '/' ) return { name: 'home', params: {} }
  if (path === '/studio') return { name: 'library', params: {} }
  if (path === '/studio/new') return { name: 'new', params: {} }

  // Starting from a template goes through the URL rather than module state, so
  // the link stays reloadable and shareable. `new` is a reserved segment, so
  // this cannot collide with the single-segment edit route below.
  const fromTemplate = /^\/studio\/new\/([^/]+)$/.exec(path)
  if (fromTemplate) {
    return { name: 'new', params: { template: decodeURIComponent(fromTemplate[1]) } }
  }

  const edit = /^\/studio\/([^/]+)$/.exec(path)
  if (edit) return { name: 'edit', params: { id: decodeURIComponent(edit[1]) } }

  return { name: 'not-found', params: {} }
}

/**
 * @param {string} path
 * @returns {void}
 */
export function navigate(path) {
  const target = `#${path}`
  if (window.location.hash === target) return
  window.location.hash = target
}

/**
 * Replace the current entry without adding to history — used when a brand new
 * agent earns its permanent URL (SPEC 97).
 * @param {string} path
 * @returns {void}
 */
export function replacePath(path) {
  const url = `${window.location.pathname}${window.location.search}#${path}`
  window.history.replaceState(null, '', url)
}

/**
 * @returns {RouteMatch}
 */
export function currentRoute() {
  return matchRoute(normalizeHash(window.location.hash))
}

/**
 * Start listening for hash changes.
 * @param {RouteHandler} handler
 * @returns {() => void} Unsubscribe.
 */
export function startRouter(handler) {
  const run = () => handler(currentRoute())
  window.addEventListener('hashchange', run)
  run()
  return () => window.removeEventListener('hashchange', run)
}
