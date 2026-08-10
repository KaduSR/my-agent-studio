// @ts-check
/**
 * Identifier generation (SPEC 90).
 *
 * crypto.randomUUID is the target, but it is only exposed on secure origins.
 * Opening the app over plain http:// on a LAN address is a real scenario, so
 * there is a getRandomValues fallback that still produces a conformant v4 UUID.
 */

/** Combining diacritical marks, stripped after NFD normalisation. */
const COMBINING_MARKS = /[̀-ͯ]/g

/**
 * @returns {string}
 */
export function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  // Set the version (4) and variant (RFC 4122) bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * URL/folder-safe slug used for exported directory names (SPEC 37).
 * @param {string} value
 * @param {string} [fallback]
 * @returns {string}
 */
export function slugify(value, fallback = 'meu-agente') {
  const slug = value
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return slug || fallback
}
