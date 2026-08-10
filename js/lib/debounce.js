// @ts-check
/**
 * Timing helpers for autosave (SPEC 57) and coalesced rendering (SPEC 63).
 */

/**
 * @template {(...args: any[]) => void} F
 * @typedef {F & { cancel: () => void, flush: () => void, pending: () => boolean }} Debounced
 */

/**
 * Delay a call until `wait` ms have passed without another call.
 * @template {(...args: any[]) => void} F
 * @param {F} fn
 * @param {number} wait
 * @returns {Debounced<F>}
 */
export function debounce(fn, wait) {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null
  /** @type {any[] | null} */
  let lastArgs = null

  /** @type {any} */
  const debounced = (/** @type {any[]} */ ...args) => {
    lastArgs = args
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      const args_ = lastArgs ?? []
      lastArgs = null
      fn(...args_)
    }, wait)
  }

  debounced.cancel = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
    lastArgs = null
  }

  debounced.flush = () => {
    if (timer === null) return
    clearTimeout(timer)
    timer = null
    const args_ = lastArgs ?? []
    lastArgs = null
    fn(...args_)
  }

  debounced.pending = () => timer !== null

  return debounced
}

/**
 * Collapse repeated calls into a single animation-frame callback, so a burst of
 * store updates repaints once instead of once per update.
 * @param {() => void} fn
 * @returns {(() => void) & { cancel: () => void }}
 */
export function rafSchedule(fn) {
  /** @type {number | null} */
  let handle = null

  const scheduled = () => {
    if (handle !== null) return
    handle = requestAnimationFrame(() => {
      handle = null
      fn()
    })
  }

  scheduled.cancel = () => {
    if (handle !== null) cancelAnimationFrame(handle)
    handle = null
  }

  return scheduled
}
