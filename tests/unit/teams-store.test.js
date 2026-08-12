import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addMember,
  getTeam,
  listTeams,
  removeMember,
  reviveTeam,
  saveTeam,
  setLead,
  setMemberInstruction,
  setTeamMode,
  teamsStore,
  updateTeamFields,
} from '../../js/stores/teams-store.js'
import { TEAM_LIMITS, createEmptyTeam, teamLead } from '../../js/team/defaults.js'

/**
 * @param {Partial<import('../../js/team/types.js').Team>} [overrides]
 * @returns {import('../../js/team/types.js').Team}
 */
function seedTeam(overrides = {}) {
  const team = createEmptyTeam({ name: 'Redação', ...overrides })
  saveTeam(team)
  // saveTeam stamps updatedAt, so read the stored copy back rather than the input.
  return /** @type {import('../../js/team/types.js').Team} */ (getTeam(team.id))
}

/** @param {string} id */
const roster = (id) =>
  /** @type {import('../../js/team/types.js').Team} */ (getTeam(id)).members.map((m) => m.agentId)

beforeEach(() => {
  teamsStore.setState({ teams: [], loaded: true })
})

describe('reviveTeam', () => {
  it('rejects anything without a string id', () => {
    expect(reviveTeam(null)).toBeNull()
    expect(reviveTeam('a team')).toBeNull()
    expect(reviveTeam({})).toBeNull()
    expect(reviveTeam({ id: '' })).toBeNull()
  })

  it('fills in every field a shorter record does not have', () => {
    const team = reviveTeam({ id: 't1' })

    expect(team).toMatchObject({ id: 't1', name: '', objective: '', mode: 'orders', leadId: null, members: [] })
    expect(team?.createdAt).toEqual(expect.any(String))
    expect(team?.updatedAt).toEqual(expect.any(String))
  })

  it('coerces an unknown mode to orders', () => {
    expect(reviveTeam({ id: 't1', mode: 'chaos' })?.mode).toBe('orders')
    expect(reviveTeam({ id: 't1', mode: 'managed' })?.mode).toBe('managed')
  })

  it('drops malformed members and keeps the readable ones', () => {
    const team = reviveTeam({
      id: 't1',
      members: [{ agentId: 'a' }, null, { instruction: 'sem agente' }, { agentId: '' }, { agentId: 'b', instruction: 'revisar' }],
    })

    expect(team?.members).toEqual([
      { agentId: 'a', instruction: '' },
      { agentId: 'b', instruction: 'revisar' },
    ])
  })

  it('deduplicates a repeated agent, keeping the first seat', () => {
    const team = reviveTeam({
      id: 't1',
      members: [{ agentId: 'a', instruction: 'primeira' }, { agentId: 'a', instruction: 'segunda' }],
    })

    expect(team?.members).toEqual([{ agentId: 'a', instruction: 'primeira' }])
  })

  it('cuts the roster at the ceiling', () => {
    const members = Array.from({ length: TEAM_LIMITS.maxMembers + 4 }, (_, i) => ({ agentId: `a${i}` }))

    expect(reviveTeam({ id: 't1', members })?.members).toHaveLength(TEAM_LIMITS.maxMembers)
  })

  it('drops a managerId that is not in the roster', () => {
    const team = reviveTeam({ id: 't1', members: [{ agentId: 'a' }], leadId: 'ghost' })

    expect(team?.leadId).toBeNull()
  })

  it('keeps a managerId that is in the roster', () => {
    const team = reviveTeam({ id: 't1', members: [{ agentId: 'a' }], leadId: 'a' })

    expect(team?.leadId).toBe('a')
  })

  it('keeps a member whose agent no longer exists', () => {
    // Pruning here would delete the order written for that agent, silently, on
    // the next load. The office shows an empty chair instead.
    const team = reviveTeam({ id: 't1', members: [{ agentId: 'deleted', instruction: 'revisar o texto' }] })

    expect(team?.members).toEqual([{ agentId: 'deleted', instruction: 'revisar o texto' }])
  })
})

describe('listTeams', () => {
  it('puts the most recently edited first', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'))
    const older = seedTeam({ name: 'Antigo' })
    vi.setSystemTime(new Date('2026-01-02T10:00:00.000Z'))
    const newer = seedTeam({ name: 'Novo' })

    expect(listTeams().map((team) => team.id)).toEqual([newer.id, older.id])
    vi.useRealTimers()
  })
})

describe('saveTeam', () => {
  it('stamps updatedAt and leaves createdAt alone', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'))
    const team = seedTeam()

    vi.setSystemTime(new Date('2026-01-01T11:30:00.000Z'))
    saveTeam(team)

    const stored = /** @type {import('../../js/team/types.js').Team} */ (getTeam(team.id))
    expect(stored.createdAt).toBe('2026-01-01T10:00:00.000Z')
    expect(stored.updatedAt).toBe('2026-01-01T11:30:00.000Z')
    vi.useRealTimers()
  })

  it('replaces rather than appends when the id already exists', () => {
    const team = seedTeam()
    saveTeam({ ...team, name: 'Outro nome' })

    expect(teamsStore.getState().teams).toHaveLength(1)
    expect(getTeam(team.id)?.name).toBe('Outro nome')
  })
})

describe('addMember', () => {
  it('seats an agent with an empty order', () => {
    const team = seedTeam()
    addMember(team.id, 'a')

    expect(getTeam(team.id)?.members).toEqual([{ agentId: 'a', instruction: '' }])
  })

  it('refuses an agent who is already seated', () => {
    const team = seedTeam()
    addMember(team.id, 'a')
    setMemberInstruction(team.id, 'a', 'revisar')

    expect(addMember(team.id, 'a')).toBeNull()
    expect(getTeam(team.id)?.members).toEqual([{ agentId: 'a', instruction: 'revisar' }])
  })

  it('refuses to go past the ceiling', () => {
    const team = seedTeam()
    for (let i = 0; i < TEAM_LIMITS.maxMembers; i += 1) addMember(team.id, `a${i}`)

    expect(addMember(team.id, 'late')).toBeNull()
    expect(roster(team.id)).toHaveLength(TEAM_LIMITS.maxMembers)
  })

  it('gives the chair to the first agent seated in a managed team', () => {
    const team = seedTeam({ mode: 'managed' })
    addMember(team.id, 'a')
    addMember(team.id, 'b')

    expect(getTeam(team.id)?.leadId).toBe('a')
  })

  it('does not promote anybody in a team giving direct orders', () => {
    const team = seedTeam()
    addMember(team.id, 'a')

    expect(getTeam(team.id)?.leadId).toBeNull()
  })
})

describe('removeMember', () => {
  it('takes the agent out and reports nothing when they were not there', () => {
    const team = seedTeam()
    addMember(team.id, 'a')

    expect(removeMember(team.id, 'ghost')).toBeNull()
    removeMember(team.id, 'a')
    expect(roster(team.id)).toEqual([])
  })

  it('leaves the team without a manager when the manager leaves', () => {
    const team = seedTeam({ mode: 'managed' })
    addMember(team.id, 'a')
    addMember(team.id, 'b')
    expect(getTeam(team.id)?.leadId).toBe('a')

    removeMember(team.id, 'a')

    const stored = /** @type {import('../../js/team/types.js').Team} */ (getTeam(team.id))
    expect(stored.leadId).toBeNull()
    expect(teamLead(stored)).toBeNull()
  })

  it('keeps the manager when somebody else leaves', () => {
    const team = seedTeam({ mode: 'managed' })
    addMember(team.id, 'a')
    addMember(team.id, 'b')

    removeMember(team.id, 'b')

    expect(getTeam(team.id)?.leadId).toBe('a')
  })
})

describe('setTeamMode', () => {
  it('promotes the first desk when switching to managed with nobody in charge', () => {
    const team = seedTeam()
    addMember(team.id, 'a')
    addMember(team.id, 'b')

    setTeamMode(team.id, 'managed')

    expect(getTeam(team.id)?.leadId).toBe('a')
  })

  it('keeps the manager already chosen', () => {
    const team = seedTeam({ mode: 'managed' })
    addMember(team.id, 'a')
    addMember(team.id, 'b')
    setLead(team.id, 'b')

    setTeamMode(team.id, 'orders')
    setTeamMode(team.id, 'managed')

    expect(getTeam(team.id)?.leadId).toBe('b')
  })

  it('leaves managerId null when there is nobody to promote', () => {
    const team = seedTeam()

    setTeamMode(team.id, 'managed')

    expect(getTeam(team.id)?.leadId).toBeNull()
  })

  it('keeps every order across a round trip between the modes', () => {
    const team = seedTeam()
    addMember(team.id, 'a')
    addMember(team.id, 'b')
    setMemberInstruction(team.id, 'a', 'escrever o rascunho')
    setMemberInstruction(team.id, 'b', 'revisar o rascunho')

    setTeamMode(team.id, 'managed')
    setTeamMode(team.id, 'orders')

    expect(getTeam(team.id)?.members).toEqual([
      { agentId: 'a', instruction: 'escrever o rascunho' },
      { agentId: 'b', instruction: 'revisar o rascunho' },
    ])
  })

  it('reports nothing when the mode is already the one asked for', () => {
    const team = seedTeam()

    expect(setTeamMode(team.id, 'orders')).toBeNull()
  })
})

describe('setManager', () => {
  it('refuses an agent who is not seated', () => {
    const team = seedTeam({ mode: 'managed' })
    addMember(team.id, 'a')

    expect(setLead(team.id, 'ghost')).toBeNull()
    expect(getTeam(team.id)?.leadId).toBe('a')
  })

  it('moves the chair between seated agents', () => {
    const team = seedTeam({ mode: 'managed' })
    addMember(team.id, 'a')
    addMember(team.id, 'b')

    setLead(team.id, 'b')

    expect(getTeam(team.id)?.leadId).toBe('b')
  })
})

describe('updateTeamFields and setMemberInstruction', () => {
  it('writes the name and the objective', () => {
    const team = seedTeam()

    updateTeamFields(team.id, { name: 'Time de conteúdo', objective: 'Publicar toda semana.' })

    expect(getTeam(team.id)).toMatchObject({
      name: 'Time de conteúdo',
      objective: 'Publicar toda semana.',
    })
  })

  it('reports nothing when the order did not actually change', () => {
    const team = seedTeam()
    addMember(team.id, 'a')
    setMemberInstruction(team.id, 'a', 'revisar')

    expect(setMemberInstruction(team.id, 'a', 'revisar')).toBeNull()
  })

  it('ignores a team that does not exist', () => {
    expect(updateTeamFields('nope', { name: 'x' })).toBeNull()
    expect(addMember('nope', 'a')).toBeNull()
  })
})

afterEach(() => {
  vi.useRealTimers()
})
