import { describe, expect, it } from 'vitest'
import { hueForAgent, hueMap } from '../../js/ui/office-sprite.js'
import { uuid } from '../../js/lib/uuid.js'
import { TEAM_LIMITS } from '../../js/team/defaults.js'

describe('hueForAgent', () => {
  it('gives the same agent the same hue every time', () => {
    const id = 'b3f0c1e2-4a5b-6c7d-8e9f-0a1b2c3d4e5f'

    expect(hueForAgent(id)).toBe(hueForAgent(id))
  })

  it('stays on the twelve-step wheel', () => {
    for (let i = 0; i < 200; i += 1) {
      const hue = hueForAgent(uuid())
      expect(hue).toBeGreaterThanOrEqual(0)
      expect(hue).toBeLessThanOrEqual(330)
      expect(hue % 30).toBe(0)
    }
  })

  it('spreads across the wheel rather than crowding one colour', () => {
    // Every agent in this app wears the same portrait, so the hue is the only
    // thing telling two desks apart. A hash that piled onto three buckets would
    // make the office read as three identical bots.
    const buckets = new Set()
    for (let i = 0; i < 500; i += 1) buckets.add(hueForAgent(uuid()))

    expect(buckets.size).toBe(12)
  })

  it('collides often enough that a room cannot rely on it alone', () => {
    // The reason hueMap exists: four ids drawn from twelve buckets repeat about
    // half the time, and two identical bots side by side defeat the colour.
    let collisions = 0
    for (let trial = 0; trial < 200; trial += 1) {
      const hues = Array.from({ length: 4 }, () => hueForAgent(uuid()))
      if (new Set(hues).size < hues.length) collisions += 1
    }

    expect(collisions).toBeGreaterThan(0)
  })

  it('answers for an empty id instead of throwing', () => {
    // The FNV offset basis lands on bucket 1, which is a fine answer; what
    // matters is that a missing id still produces a drawable colour.
    const hue = hueForAgent('')
    expect(Number.isInteger(hue)).toBe(true)
    expect(hue % 30).toBe(0)
  })
})

describe('hueMap', () => {
  it('gives every seat in a full roster its own colour', () => {
    for (let trial = 0; trial < 200; trial += 1) {
      const ids = Array.from({ length: TEAM_LIMITS.maxMembers }, () => uuid())
      const hues = [...hueMap(ids).values()]

      expect(new Set(hues).size).toBe(ids.length)
    }
  })

  it('keeps the id-chosen colour when nothing is in the way', () => {
    const id = uuid()

    expect(hueMap([id]).get(id)).toBe(hueForAgent(id))
  })

  it('is stable for the same roster in the same order', () => {
    const ids = Array.from({ length: 5 }, () => uuid())

    expect([...hueMap(ids).values()]).toEqual([...hueMap(ids).values()])
  })

  it('answers for every id, and only once for a repeated one', () => {
    const id = uuid()
    const map = hueMap([id, id])

    expect(map.size).toBe(1)
    expect(map.get(id)).toBe(hueForAgent(id))
  })

  it('stays on the wheel even after walking away from a collision', () => {
    const ids = Array.from({ length: TEAM_LIMITS.maxMembers }, () => uuid())

    for (const hue of hueMap(ids).values()) {
      expect(hue % 30).toBe(0)
      expect(hue).toBeGreaterThanOrEqual(0)
      expect(hue).toBeLessThan(360)
    }
  })
})
