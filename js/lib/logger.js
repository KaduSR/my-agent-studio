// @ts-check
/**
 * Logging seam (SPEC 99). Console-backed for the MVP; the indirection is here
 * so a future observability backend can be swapped in at one place.
 */

/** @typedef {'debug' | 'info' | 'warn' | 'error'} LogLevel */

/** @type {((level: LogLevel, message: string, details: unknown[]) => void) | null} */
let sink = null

/**
 * Replace the console sink — used by tests and by future observability wiring.
 * @param {((level: LogLevel, message: string, details: unknown[]) => void) | null} next
 * @returns {void}
 */
export function setLogSink(next) {
  sink = next
}

/**
 * @param {LogLevel} level
 * @param {string} message
 * @param {unknown[]} details
 * @returns {void}
 */
function emit(level, message, details) {
  if (sink) {
    sink(level, message, details)
    return
  }
  const prefix = `[agent-studio] ${message}`
  if (level === 'error') console.error(prefix, ...details)
  else if (level === 'warn') console.warn(prefix, ...details)
  else if (level === 'info') console.info(prefix, ...details)
  else console.debug(prefix, ...details)
}

export const logger = {
  /** @param {string} message @param {...unknown} details */
  debug: (message, ...details) => emit('debug', message, details),
  /** @param {string} message @param {...unknown} details */
  info: (message, ...details) => emit('info', message, details),
  /** @param {string} message @param {...unknown} details */
  warn: (message, ...details) => emit('warn', message, details),
  /** @param {string} message @param {...unknown} details */
  error: (message, ...details) => emit('error', message, details),
}
