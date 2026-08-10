// @ts-check
/**
 * Analytics seam (SPEC 69).
 *
 * The MVP ships a no-op that only logs in debug builds — SPEC 68 is explicit
 * that nothing about the user's agent leaves the browser. The abstraction
 * exists so a real provider can be attached later without touching call sites.
 */

import { logger } from './logger.js'

/**
 * @typedef {'agent_created'
 *   | 'step_viewed'
 *   | 'tone_selected'
 *   | 'tool_enabled'
 *   | 'markdown_copied'
 *   | 'agent_exported'
 *   | 'zip_exported'
 *   | 'agent_duplicated'
 *   | 'agent_deleted'
 *   | 'draft_restored'} AnalyticsEvent
 */

/** @type {((event: AnalyticsEvent, payload: Record<string, unknown>) => void) | null} */
let handler = null

/**
 * Attach a real analytics provider. Not used in the MVP.
 * @param {((event: AnalyticsEvent, payload: Record<string, unknown>) => void) | null} next
 * @returns {void}
 */
export function setAnalyticsHandler(next) {
  handler = next
}

/**
 * @param {AnalyticsEvent} event
 * @param {Record<string, unknown>} [payload]
 * @returns {void}
 */
export function trackEvent(event, payload = {}) {
  if (handler) {
    handler(event, payload)
    return
  }
  logger.debug(`event: ${event}`, payload)
}
