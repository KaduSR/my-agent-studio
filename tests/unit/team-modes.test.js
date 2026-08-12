import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TEAM_MODE,
  TEAM_MODES,
  TEAM_MODE_IDS,
  getTeamMode,
  isTeamMode,
  leadLabel,
  modeNeedsLead,
} from '../../js/data/team-modes.js'
import { hasIcon } from '../../js/icons.js'

describe('the catalogue', () => {
  it('ships the four shapes the keynote teaches', () => {
    expect(TEAM_MODE_IDS).toEqual(['orders', 'chain', 'review', 'managed'])
  })

  it('uses only icon names that exist', () => {
    // icon() throws on an unknown name, so a typo here would blow up at render
    // instead of failing a test.
    for (const mode of TEAM_MODES) {
      expect(hasIcon(mode.icon), mode.id).toBe(true)
    }
  })

  it('gives every mode the copy the interface needs', () => {
    for (const mode of TEAM_MODES) {
      for (const field of ['label', 'description', 'instructionLabel', 'instructionPlaceholder', 'caption', 'summary', 'stop']) {
        expect(String(mode[/** @type {keyof typeof mode} */ (field)]).trim().length, `${mode.id}.${field}`).toBeGreaterThan(0)
      }
      expect(mode.loop.length, mode.id).toBeGreaterThanOrEqual(3)
    }
  })

  it('gives a mode with a lead everything that seat needs, and a mode without one none of it', () => {
    for (const mode of TEAM_MODES) {
      if (mode.lead) {
        expect(mode.leadLabel, mode.id).toBeTruthy()
        expect(mode.promoteLabel, mode.id).toBeTruthy()
        expect(mode.leadInstructionLabel, mode.id).toBeTruthy()
        expect(mode.leadInstructionPlaceholder, mode.id).toBeTruthy()
      } else {
        expect(mode.leadLabel, mode.id).toBeUndefined()
        expect(mode.promoteLabel, mode.id).toBeUndefined()
      }
    }
  })

  it('says which modes single out a seat, and which run in order', () => {
    expect(modeNeedsLead('orders')).toBe(false)
    expect(modeNeedsLead('chain')).toBe(false)
    expect(modeNeedsLead('review')).toBe(true)
    expect(modeNeedsLead('managed')).toBe(true)

    expect(getTeamMode('chain').sequential).toBe(true)
    expect(getTeamMode('orders').sequential).toBe(false)
  })

  it('names the two lead roles apart, because they are different jobs', () => {
    expect(getTeamMode('managed').lead).toBe('manager')
    expect(getTeamMode('review').lead).toBe('reviewer')
    expect(leadLabel('managed')).toBe('Gerente')
    expect(leadLabel('review')).toBe('Avaliador')
  })

  it('uses no em dash in anything the interface shows', () => {
    for (const mode of TEAM_MODES) {
      const copy = [mode.label, mode.description, mode.caption, mode.instructionLabel, mode.instructionPlaceholder]
      expect(copy.join(' '), mode.id).not.toContain('—')
    }
  })
})

describe('getTeamMode', () => {
  it('always resolves, so no caller has to defend against a missing mode', () => {
    expect(getTeamMode(/** @type {any} */ ('nao-existe')).id).toBe(DEFAULT_TEAM_MODE)
  })

  it('recognises exactly the ids it ships', () => {
    for (const id of TEAM_MODE_IDS) expect(isTeamMode(id)).toBe(true)
    expect(isTeamMode('chaos')).toBe(false)
    expect(isTeamMode(null)).toBe(false)
    expect(isTeamMode(undefined)).toBe(false)
  })
})
