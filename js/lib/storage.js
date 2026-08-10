// @ts-check
/**
 * localStorage access (ADR-001).
 *
 * Every call is guarded: private-browsing modes, disabled storage and quota
 * exhaustion all throw, and SPEC 98 requires us to surface that to the user
 * rather than lose their work silently.
 */

import { logger } from './logger.js'

export const STORAGE_KEYS = Object.freeze({
  agents: 'agent-studio:agents',
  draft: 'agent-studio:draft',
  previewCollapsed: 'agent-studio:preview-collapsed',
  openSections: 'agent-studio:open-sections',
  sidebarCollapsed: 'agent-studio:sidebar-collapsed',
})

/**
 * @typedef {{ ok: true }} WriteOk
 * @typedef {{ ok: false, reason: 'unavailable' | 'quota' | 'unknown', error: unknown }} WriteError
 * @typedef {WriteOk | WriteError} WriteResult
 */

/**
 * Reaching for window.localStorage is itself enough of a probe: blocked
 * contexts throw on property access. Deliberately no test write — on a storage
 * that is merely *full*, a probe write would fail too and every quota error
 * would be misreported as "storage unavailable", costing the user the specific
 * message SPEC 98 wants them to see.
 * @returns {Storage | null}
 */
function getStorage() {
  try {
    const storage = window.localStorage
    return storage ?? null
  } catch (error) {
    logger.warn('localStorage is unavailable', error)
    return null
  }
}

/**
 * True when the browser lets us persist at all.
 * @returns {boolean}
 */
export function isStorageAvailable() {
  return getStorage() !== null
}

/**
 * Read and parse a JSON value, falling back when absent or corrupt.
 * @template T
 * @param {string} key
 * @param {T} fallback
 * @returns {T}
 */
export function readJSON(key, fallback) {
  const storage = getStorage()
  if (!storage) return fallback

  const raw = storage.getItem(key)
  if (raw === null) return fallback

  try {
    const parsed = JSON.parse(raw)
    return parsed === null ? fallback : parsed
  } catch (error) {
    logger.error(`Corrupt JSON in "${key}" — falling back to default`, error)
    return fallback
  }
}

/**
 * Serialize and persist a value.
 * @param {string} key
 * @param {unknown} value
 * @returns {WriteResult}
 */
export function writeJSON(key, value) {
  const storage = getStorage()
  if (!storage) return { ok: false, reason: 'unavailable', error: null }

  try {
    storage.setItem(key, JSON.stringify(value))
    return { ok: true }
  } catch (error) {
    const quota =
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    logger.error(`Failed to persist "${key}"`, error)
    return { ok: false, reason: quota ? 'quota' : 'unknown', error }
  }
}

/**
 * @param {string} key
 * @returns {void}
 */
export function removeKey(key) {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(key)
  } catch (error) {
    logger.warn(`Failed to remove "${key}"`, error)
  }
}
