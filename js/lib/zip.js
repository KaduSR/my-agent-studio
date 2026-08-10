// @ts-check
/**
 * A minimal ZIP writer (ADR-011, implemented natively).
 *
 * SPEC 102.3 says not to add a dependency when a platform API does the job.
 * There is no ZIP API, but there *is* CompressionStream('deflate-raw'), which
 * is exactly the payload format ZIP method 8 expects — so the only thing left
 * to write is the container: local headers, a central directory and an EOCD
 * record. Entries fall back to STORE (method 0) when compression is
 * unavailable or when it would make the entry bigger.
 *
 * Deliberately out of scope: ZIP64, encryption, multi-disk archives. An agent
 * export is a handful of small text files, far below the 4GB/65535-entry
 * limits where any of that would matter.
 */

const LOCAL_HEADER_SIG = 0x04034b50
const CENTRAL_HEADER_SIG = 0x02014b50
const EOCD_SIG = 0x06054b50

/** Bit 11 marks the filename as UTF-8, which matters for accented paths. */
const FLAG_UTF8 = 0x0800
const VERSION_NEEDED = 20

const METHOD_STORE = 0
const METHOD_DEFLATE = 8

/** @type {Uint32Array | null} */
let crcTable = null

/**
 * @returns {Uint32Array}
 */
function getCrcTable() {
  if (crcTable) return crcTable
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  crcTable = table
  return table
}

/**
 * @param {Uint8Array} bytes
 * @returns {number} Unsigned CRC-32.
 */
export function crc32(bytes) {
  const table = getCrcTable()
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) {
    crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * MS-DOS packed date/time, the only timestamp format the base ZIP spec has.
 * @param {Date} date
 * @returns {{ time: number, date: number }}
 */
export function toDosDateTime(date) {
  const year = Math.max(1980, date.getFullYear())
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

/**
 * @param {Uint8Array} bytes
 * @returns {Promise<Uint8Array<ArrayBuffer> | null>} null when raw deflate is unavailable.
 */
async function deflateRaw(bytes) {
  if (typeof CompressionStream === 'undefined') return null

  try {
    const stream = new CompressionStream('deflate-raw')
    const writer = stream.writable.getWriter()
    void writer.write(/** @type {BufferSource} */ (/** @type {unknown} */ (bytes)))
    void writer.close()

    /** @type {Uint8Array[]} */
    const parts = []
    const reader = stream.readable.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) parts.push(value)
    }
    return concat(parts)
  } catch {
    return null
  }
}

/**
 * @param {ReadonlyArray<Uint8Array>} parts
 * @returns {Uint8Array<ArrayBuffer>}
 */
function concat(parts) {
  let total = 0
  for (const part of parts) total += part.length
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

/**
 * @typedef {Object} ZipEntry
 * @property {string} path      Forward-slash separated path inside the archive.
 * @property {string | Uint8Array} content
 */

/**
 * @typedef {Object} ZipOptions
 * @property {Date} [date] Timestamp stamped on every entry.
 * @property {boolean} [compress] Set false to force STORE. Defaults to true.
 */

/**
 * Build a ZIP archive.
 * @param {ReadonlyArray<ZipEntry>} entries
 * @param {ZipOptions} [options]
 * @returns {Promise<Uint8Array<ArrayBuffer>>}
 */
export async function createZip(entries, options = {}) {
  if (entries.length > 0xffff) {
    throw new Error('Too many entries for a non-ZIP64 archive')
  }

  const encoder = new TextEncoder()
  const stamp = toDosDateTime(options.date ?? new Date())
  const compress = options.compress !== false

  /** @type {Uint8Array[]} */
  const chunks = []
  /** @type {{ nameBytes: Uint8Array, method: number, crc: number, compressedSize: number, size: number, offset: number }[]} */
  const directory = []
  let offset = 0

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.path)
    const data =
      typeof entry.content === 'string' ? encoder.encode(entry.content) : entry.content

    const crc = crc32(data)
    let method = METHOD_STORE
    let payload = data

    if (compress && data.length > 0) {
      const deflated = await deflateRaw(data)
      // Only take the compressed form when it actually helps.
      if (deflated && deflated.length < data.length) {
        method = METHOD_DEFLATE
        payload = deflated
      }
    }

    const header = new Uint8Array(30 + nameBytes.length)
    const view = new DataView(header.buffer)
    view.setUint32(0, LOCAL_HEADER_SIG, true)
    view.setUint16(4, VERSION_NEEDED, true)
    view.setUint16(6, FLAG_UTF8, true)
    view.setUint16(8, method, true)
    view.setUint16(10, stamp.time, true)
    view.setUint16(12, stamp.date, true)
    view.setUint32(14, crc, true)
    view.setUint32(18, payload.length, true)
    view.setUint32(22, data.length, true)
    view.setUint16(26, nameBytes.length, true)
    view.setUint16(28, 0, true)
    header.set(nameBytes, 30)

    chunks.push(header, payload)
    directory.push({
      nameBytes,
      method,
      crc,
      compressedSize: payload.length,
      size: data.length,
      offset,
    })
    offset += header.length + payload.length
  }

  const centralStart = offset

  for (const entry of directory) {
    const header = new Uint8Array(46 + entry.nameBytes.length)
    const view = new DataView(header.buffer)
    view.setUint32(0, CENTRAL_HEADER_SIG, true)
    view.setUint16(4, VERSION_NEEDED, true)
    view.setUint16(6, VERSION_NEEDED, true)
    view.setUint16(8, FLAG_UTF8, true)
    view.setUint16(10, entry.method, true)
    view.setUint16(12, stamp.time, true)
    view.setUint16(14, stamp.date, true)
    view.setUint32(16, entry.crc, true)
    view.setUint32(20, entry.compressedSize, true)
    view.setUint32(24, entry.size, true)
    view.setUint16(28, entry.nameBytes.length, true)
    view.setUint16(30, 0, true) // extra field length
    view.setUint16(32, 0, true) // comment length
    view.setUint16(34, 0, true) // disk number start
    view.setUint16(36, 0, true) // internal attributes
    view.setUint32(38, 0, true) // external attributes
    view.setUint32(42, entry.offset, true)
    header.set(entry.nameBytes, 46)

    chunks.push(header)
    offset += header.length
  }

  const eocd = new Uint8Array(22)
  const view = new DataView(eocd.buffer)
  view.setUint32(0, EOCD_SIG, true)
  view.setUint16(4, 0, true)
  view.setUint16(6, 0, true)
  view.setUint16(8, directory.length, true)
  view.setUint16(10, directory.length, true)
  view.setUint32(12, offset - centralStart, true)
  view.setUint32(16, centralStart, true)
  view.setUint16(20, 0, true)
  chunks.push(eocd)

  return concat(chunks)
}
