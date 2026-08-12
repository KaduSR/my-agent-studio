import { describe, expect, it } from 'vitest'
import {
  ALWAYS_MEMORY_KINDS,
  MEMORY_KINDS,
  MEMORY_TYPES,
  getMemoryKind,
} from '../../js/data/memory.js'
import { hasIcon } from '../../js/icons.js'

describe('the memory catalogues', () => {
  it('names only icons that exist', () => {
    // icon() throws on an unknown name, and the throw takes the whole step down
    // with it, so this is the cheap way to find a typo.
    for (const type of MEMORY_TYPES) expect(hasIcon(type.icon), type.id).toBe(true)
    for (const kind of MEMORY_KINDS) expect(hasIcon(kind.icon), kind.id).toBe(true)
  })

  it('keeps the two axes apart', () => {
    // Retention answers "for how long", kinds answer "in what shape". Sharing an
    // id between them would make one look like a synonym for the other.
    const types = new Set(MEMORY_TYPES.map((type) => type.id))
    for (const kind of MEMORY_KINDS) expect(types.has(/** @type {any} */ (kind.id)), kind.id).toBe(false)
  })

  it('gives every kind the copy the card needs', () => {
    for (const kind of MEMORY_KINDS) {
      expect(kind.label.trim().length, kind.id).toBeGreaterThan(0)
      expect(kind.description.trim().length, kind.id).toBeGreaterThan(0)
      expect(getMemoryKind(kind.id)).toBe(kind)
    }
  })

  it('marks the context window as the one nobody chooses', () => {
    expect(ALWAYS_MEMORY_KINDS).toEqual(['context-window'])
    expect(getMemoryKind('context-window')?.always).toBe(true)
  })

  it('uses no em dash in anything the step shows', () => {
    for (const kind of MEMORY_KINDS) {
      expect(`${kind.label} ${kind.description} ${kind.tooltip ?? ''}`, kind.id).not.toContain('—')
    }
  })
})
