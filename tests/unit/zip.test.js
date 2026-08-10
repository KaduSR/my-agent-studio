import { describe, expect, it } from 'vitest'
import { inflateRawSync } from 'node:zlib'
import { createZip, crc32, toDosDateTime } from '../../js/lib/zip.js'

/**
 * Parse an archive the way a real unzip implementation does: start from the
 * End Of Central Directory record, walk the central directory, then follow each
 * entry's offset to its local header. If the writer got any size or offset
 * wrong, this throws instead of quietly returning something plausible.
 *
 * @param {Uint8Array} bytes
 */
function readZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  let eocd = -1
  for (let i = bytes.length - 22; i >= 0; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd === -1) throw new Error('EOCD record not found')

  const total = view.getUint16(eocd + 10, true)
  const centralSize = view.getUint32(eocd + 12, true)
  const centralStart = view.getUint32(eocd + 16, true)
  expect(centralStart + centralSize).toBe(eocd)

  const decoder = new TextDecoder()
  const entries = []
  let cursor = centralStart

  for (let i = 0; i < total; i += 1) {
    expect(view.getUint32(cursor, true)).toBe(0x02014b50)

    const flags = view.getUint16(cursor + 8, true)
    const method = view.getUint16(cursor + 10, true)
    const crc = view.getUint32(cursor + 16, true)
    const compressedSize = view.getUint32(cursor + 20, true)
    const size = view.getUint32(cursor + 24, true)
    const nameLength = view.getUint16(cursor + 28, true)
    const extraLength = view.getUint16(cursor + 30, true)
    const commentLength = view.getUint16(cursor + 32, true)
    const localOffset = view.getUint32(cursor + 42, true)
    const path = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength))

    expect(view.getUint32(localOffset, true)).toBe(0x04034b50)
    const localNameLength = view.getUint16(localOffset + 26, true)
    const localExtraLength = view.getUint16(localOffset + 28, true)
    const dataStart = localOffset + 30 + localNameLength + localExtraLength
    const raw = bytes.subarray(dataStart, dataStart + compressedSize)

    const content = method === 0 ? Buffer.from(raw) : inflateRawSync(Buffer.from(raw))
    expect(content.length).toBe(size)
    expect(crc32(new Uint8Array(content))).toBe(crc)

    entries.push({ path, method, flags, size, text: decoder.decode(content) })
    cursor += 46 + nameLength + extraLength + commentLength
  }

  return entries
}

describe('crc32', () => {
  it('matches the reference value for a known input', () => {
    // "123456789" is the standard CRC-32 check vector.
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  it('returns 0 for empty input', () => {
    expect(crc32(new Uint8Array(0))).toBe(0)
  })
})

describe('toDosDateTime', () => {
  it('packs a date into the MS-DOS format', () => {
    const { time, date } = toDosDateTime(new Date(2026, 7, 10, 13, 45, 30))
    expect(date).toBe(((2026 - 1980) << 9) | (8 << 5) | 10)
    expect(time).toBe((13 << 11) | (45 << 5) | 15)
  })

  it('clamps years below the 1980 epoch', () => {
    const { date } = toDosDateTime(new Date(1970, 0, 1))
    expect(date >> 9).toBe(0)
  })
})

describe('createZip', () => {
  it('round-trips a multi-file archive through a real inflate', async () => {
    const bytes = await createZip([
      { path: 'AGENT.md', content: '# Assistente\n\nConteúdo com acentuação.\n' },
      { path: 'nested/deep/config.json', content: '{\n  "ok": true\n}\n' },
    ])

    const entries = readZip(bytes)
    expect(entries.map((entry) => entry.path)).toEqual(['AGENT.md', 'nested/deep/config.json'])
    expect(entries[0].text).toContain('Conteúdo com acentuação.')
    expect(entries[1].text).toContain('"ok": true')
  })

  it('marks filenames as UTF-8 so accented paths survive', async () => {
    const bytes = await createZip([{ path: 'memória/ação.md', content: 'x' }])
    const [entry] = readZip(bytes)
    expect(entry.path).toBe('memória/ação.md')
    expect(entry.flags & 0x0800).toBe(0x0800)
  })

  it('compresses repetitive content with deflate', async () => {
    const bytes = await createZip([{ path: 'big.md', content: 'a'.repeat(5000) }])
    const [entry] = readZip(bytes)
    expect(entry.method).toBe(8)
    expect(entry.size).toBe(5000)
    expect(bytes.length).toBeLessThan(1000)
  })

  it('stores content when compression would not help', async () => {
    const bytes = await createZip([{ path: 'tiny.md', content: 'ab' }])
    const [entry] = readZip(bytes)
    expect(entry.method).toBe(0)
    expect(entry.text).toBe('ab')
  })

  it('honours compress: false', async () => {
    const bytes = await createZip([{ path: 'big.md', content: 'a'.repeat(5000) }], {
      compress: false,
    })
    const [entry] = readZip(bytes)
    expect(entry.method).toBe(0)
    expect(entry.text.length).toBe(5000)
  })

  it('handles an empty file and an empty archive', async () => {
    const withEmptyFile = readZip(await createZip([{ path: 'empty.md', content: '' }]))
    expect(withEmptyFile[0].size).toBe(0)

    const empty = await createZip([])
    expect(readZip(empty)).toEqual([])
  })

  it('accepts raw bytes as content', async () => {
    const bytes = await createZip([
      { path: 'raw.bin', content: new Uint8Array([104, 105]) },
    ])
    expect(readZip(bytes)[0].text).toBe('hi')
  })
})
