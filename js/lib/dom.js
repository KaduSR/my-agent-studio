// @ts-check
/**
 * Tiny DOM builder.
 *
 * Every value that originates from the user reaches the page through
 * createTextNode / textContent, never through the HTML parser. This is what
 * makes SPEC 67 structurally true instead of a rule someone has to remember.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Keys applied as DOM properties instead of attributes. */
const PROP_KEYS = new Set([
  'value',
  'checked',
  'disabled',
  'selected',
  'indeterminate',
  'textContent',
  'htmlFor',
])

/**
 * @typedef {Node | string | number | false | null | undefined} Child
 * @typedef {Child | Child[]} Children
 */

/**
 * Append children to a parent, flattening arrays and skipping empty values.
 * @param {Node} parent
 * @param {Children[]} children
 * @returns {void}
 */
export function append(parent, ...children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue
    if (Array.isArray(child)) {
      append(parent, ...child)
    } else if (child instanceof Node) {
      parent.appendChild(child)
    } else {
      parent.appendChild(document.createTextNode(String(child)))
    }
  }
}

/**
 * @param {Element} el
 * @param {Record<string, any>} props
 * @returns {void}
 */
function applyProps(el, props) {
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined) continue

    if (key === 'class') {
      el.setAttribute('class', String(value))
    } else if (key === 'dataset') {
      if (el instanceof HTMLElement) Object.assign(el.dataset, value)
    } else if (key === 'style') {
      if (el instanceof HTMLElement || el instanceof SVGElement) Object.assign(el.style, value)
    } else if (key === 'ref') {
      if (typeof value === 'function') value(el)
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value)
    } else if (PROP_KEYS.has(key)) {
      /** @type {any} */ (el)[key] = value
    } else if (value === true) {
      el.setAttribute(key, '')
    } else if (value === false) {
      el.removeAttribute(key)
    } else {
      el.setAttribute(key, String(value))
    }
  }
}

/**
 * Create an HTML element.
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag
 * @param {Record<string, any> | null} [props]
 * @param {...Children} children
 * @returns {HTMLElementTagNameMap[K]}
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag)
  if (props) applyProps(el, props)
  append(el, ...children)
  return el
}

/**
 * Create an SVG element.
 * @template {keyof SVGElementTagNameMap} K
 * @param {K} tag
 * @param {Record<string, any> | null} [props]
 * @param {...Children} children
 * @returns {SVGElementTagNameMap[K]}
 */
export function s(tag, props, ...children) {
  const el = document.createElementNS(SVG_NS, tag)
  if (props) applyProps(el, props)
  append(el, ...children)
  return el
}

/**
 * @param {...Children} children
 * @returns {DocumentFragment}
 */
export function frag(...children) {
  const f = document.createDocumentFragment()
  append(f, ...children)
  return f
}

/**
 * Remove every child of a node.
 * @param {Node} node
 * @returns {void}
 */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild)
}

/**
 * Replace a node's children in one step.
 * @param {Node} parent
 * @param {...Children} children
 * @returns {void}
 */
export function setChildren(parent, ...children) {
  clear(parent)
  append(parent, ...children)
}

/**
 * Add a listener and get back a function that removes it.
 * @param {EventTarget} target
 * @param {string} type
 * @param {EventListenerOrEventListenerObject} handler
 * @param {AddEventListenerOptions | boolean} [options]
 * @returns {() => void}
 */
export function on(target, type, handler, options) {
  target.addEventListener(type, handler, options)
  return () => target.removeEventListener(type, handler, options)
}

/**
 * Join class names, dropping falsy entries.
 * @param {...(string | false | null | undefined)} parts
 * @returns {string}
 */
export function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

/**
 * Query a required element, throwing when the selector does not match.
 * @template {Element} T
 * @param {string} selector
 * @param {ParentNode} [root]
 * @returns {T}
 */
export function query(selector, root = document) {
  const el = root.querySelector(selector)
  if (!el) throw new Error(`Element not found for selector: ${selector}`)
  return /** @type {T} */ (el)
}
