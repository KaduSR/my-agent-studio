import { describe, expect, it } from 'vitest'
import { SOUL_PRESETS, getSoulPreset } from '../../js/data/soul-presets.js'
import { SOUL_VALUES } from '../../js/data/soul-values.js'
import { hasIcon } from '../../js/icons.js'
import { LIMITS } from '../../js/agent/validate.js'

/**
 * @param {ReadonlyArray<{ id: string }>} catalogue
 * @returns {string[]}
 */
const ids = (catalogue) => catalogue.map((entry) => entry.id)

/**
 * A wrong id here does not throw. The value simply matches nothing and the
 * preset lands with one fewer chip selected; a wrong icon name, on the other
 * hand, throws at render time. Both are cheaper to catch here.
 */
describe.each(SOUL_PRESETS.map((preset) => [preset.id, preset]))(
  'soul preset %s',
  (_id, preset) => {
    it('uses an icon that is actually bundled', () => {
      expect(hasIcon(preset.icon)).toBe(true)
    })

    it('uses real soul values, without repeats', () => {
      expect(preset.soul.values.length).toBeGreaterThan(0)
      for (const value of preset.soul.values) {
        expect(ids(SOUL_VALUES)).toContain(value)
      }
      expect(new Set(preset.soul.values).size).toBe(preset.soul.values.length)
    })

    it('fills all three fields within the step ceiling', () => {
      for (const field of /** @type {const} */ (['mission', 'essence', 'philosophy'])) {
        expect(preset.soul[field].length, field).toBeGreaterThan(20)
        expect(preset.soul[field].length, field).toBeLessThanOrEqual(LIMITS.soulFieldMax)
      }
    })

    it('carries the text the pill needs', () => {
      expect(preset.label.length).toBeGreaterThan(0)
      expect(preset.description.length).toBeGreaterThan(10)
    })
  }
)

describe('the catalogue as a whole', () => {
  it('has unique ids', () => {
    const all = ids(SOUL_PRESETS)
    expect(new Set(all).size).toBe(all.length)
  })

  it('offers a distinct starting point per preset', () => {
    const missions = SOUL_PRESETS.map((preset) => preset.soul.mission)
    expect(new Set(missions).size).toBe(missions.length)
  })

  it('stays small enough to read as one row of choices', () => {
    expect(SOUL_PRESETS.length).toBeGreaterThanOrEqual(5)
    expect(SOUL_PRESETS.length).toBeLessThanOrEqual(8)
  })
})

describe('lookup helper', () => {
  it('finds by id and is safe for an unknown one', () => {
    expect(getSoulPreset('socratic-tutor')?.label).toBe('Tutor Socrático')
    expect(getSoulPreset('inventada')).toBeUndefined()
    expect(getSoulPreset('')).toBeUndefined()
  })
})
