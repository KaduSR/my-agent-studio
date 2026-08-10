// @ts-check
/**
 * Minimal observable store — the vanilla stand-in for ADR-006 (Zustand).
 *
 * The selector-based subscription is the important part: SPEC 63 wants the
 * preview to react in under 100ms, and SPEC 102.11 wants every input live, but
 * re-rendering the whole builder on each keystroke would blow away focus and
 * caret position. Subscribers therefore listen to a slice and only run when
 * that slice actually changes.
 */

/**
 * @template S
 * @typedef {Object} Store
 * @property {() => S} getState
 * @property {(partial: Partial<S> | ((state: S) => Partial<S>)) => void} setState
 * @property {(listener: (state: S, prev: S) => void) => () => void} subscribe
 * @property {<T>(selector: (state: S) => T, listener: (value: T, prev: T) => void, options?: SelectOptions<T>) => () => void} select
 */

/**
 * @template T
 * @typedef {Object} SelectOptions
 * @property {(a: T, b: T) => boolean} [equals] Custom comparison; defaults to shallow equality.
 * @property {boolean} [immediate] Run the listener once on subscribe.
 */

/**
 * Shallow equality for primitives, arrays and plain objects.
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export function shallowEqual(a, b) {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false

  if (Array.isArray(a) !== Array.isArray(b)) return false

  const aKeys = Object.keys(/** @type {Record<string, unknown>} */ (a))
  const bKeys = Object.keys(/** @type {Record<string, unknown>} */ (b))
  if (aKeys.length !== bKeys.length) return false

  for (const key of aKeys) {
    const av = /** @type {Record<string, unknown>} */ (a)[key]
    const bv = /** @type {Record<string, unknown>} */ (b)[key]
    if (!Object.is(av, bv)) return false
  }
  return true
}

/**
 * @template S
 * @param {S} initialState
 * @returns {Store<S>}
 */
export function createStore(initialState) {
  let state = initialState
  /** @type {Set<(state: S, prev: S) => void>} */
  const listeners = new Set()

  const getState = () => state

  /** @type {Store<S>['setState']} */
  function setState(partial) {
    const patch = typeof partial === 'function' ? partial(state) : partial
    const next = { ...state, ...patch }
    if (shallowEqual(state, next)) return
    const prev = state
    state = next
    for (const listener of [...listeners]) listener(state, prev)
  }

  /** @type {Store<S>['subscribe']} */
  function subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  /** @type {Store<S>['select']} */
  function select(selector, listener, options = {}) {
    const equals = options.equals ?? shallowEqual
    let current = selector(state)
    if (options.immediate) listener(current, current)
    return subscribe((next) => {
      const value = selector(next)
      if (equals(value, current)) return
      const prev = current
      current = value
      listener(value, prev)
    })
  }

  return { getState, setState, subscribe, select }
}
