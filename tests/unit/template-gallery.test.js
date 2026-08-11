import { describe, expect, it } from 'vitest'
import { paginate, PER_PAGE } from '../../js/ui/template-gallery.js'
import { TEMPLATES } from '../../js/data/templates.js'

describe('paginate', () => {
  it('fills every page but the last', () => {
    const pages = paginate([1, 2, 3, 4, 5, 6, 7], 3)
    expect(pages).toEqual([
      [1, 2, 3],
      [4, 5, 6],
      [7],
    ])
  })

  it('always returns at least one page, so the carousel has something to show', () => {
    expect(paginate([], 6)).toEqual([[]])
  })

  it('does not divide by a page size of zero', () => {
    expect(paginate([1, 2], 0)).toEqual([[1, 2]])
  })

  it('deals the whole catalogue out, losing nothing', () => {
    const pages = paginate(TEMPLATES, PER_PAGE)
    expect(pages.flat()).toHaveLength(TEMPLATES.length)
    expect(pages.length).toBe(Math.ceil(TEMPLATES.length / PER_PAGE))
  })
})
