import { describe, expect, it } from 'vitest'
import { invertTransform, isNegligible, toTransform } from '../../js/ui/flip.js'

/**
 * @param {number} left
 * @param {number} top
 * @param {number} width
 * @param {number} height
 */
const box = (left, top, width, height) => ({ left, top, width, height })

describe('invertTransform', () => {
  it('computes the offset that puts the element back where it was', () => {
    const first = box(100, 50, 200, 200)
    const last = box(400, 250, 200, 200)

    expect(invertTransform(first, last)).toEqual({ dx: -300, dy: -200, sx: 1, sy: 1 })
  })

  it('computes the scale that restores the old size', () => {
    const first = box(0, 0, 100, 50)
    const last = box(0, 0, 200, 200)

    expect(invertTransform(first, last)).toEqual({ dx: 0, dy: 0, sx: 0.5, sy: 0.25 })
  })

  it('handles growing as well as shrinking', () => {
    const { sx } = invertTransform(box(0, 0, 300, 300), box(0, 0, 150, 150))
    expect(sx).toBe(2)
  })

  it('falls back to scale 1 when the new size is zero', () => {
    // An element that is not laid out has no size; dividing by it would give
    // Infinity and produce an invalid transform.
    const inversion = invertTransform(box(0, 0, 100, 100), box(0, 0, 0, 0))
    expect(inversion.sx).toBe(1)
    expect(inversion.sy).toBe(1)
    expect(Number.isFinite(inversion.sx)).toBe(true)
  })

  it('is identity when nothing moved', () => {
    const same = box(10, 20, 30, 40)
    expect(invertTransform(same, same)).toEqual({ dx: 0, dy: 0, sx: 1, sy: 1 })
  })
})

describe('isNegligible', () => {
  it('rejects an unchanged box', () => {
    expect(isNegligible({ dx: 0, dy: 0, sx: 1, sy: 1 })).toBe(true)
  })

  it('rejects sub-pixel drift', () => {
    expect(isNegligible({ dx: 0.2, dy: -0.3, sx: 1.002, sy: 0.999 })).toBe(true)
  })

  it('accepts a real move', () => {
    expect(isNegligible({ dx: 12, dy: 0, sx: 1, sy: 1 })).toBe(false)
  })

  it('accepts a real resize even with no movement', () => {
    expect(isNegligible({ dx: 0, dy: 0, sx: 1.4, sy: 1.4 })).toBe(false)
  })
})

describe('toTransform', () => {
  it('emits translate before scale, so the offset is not scaled', () => {
    expect(toTransform({ dx: -10, dy: 20, sx: 0.5, sy: 2 })).toBe(
      'translate(-10px, 20px) scale(0.5, 2)'
    )
  })
})
