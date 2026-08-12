import { beforeEach, describe, expect, it } from 'vitest'
import { TEAM_TEMPLATES, getTeamTemplate } from '../../js/data/team-templates.js'
import { TEAM_MODE_IDS, TEAM_LIMITS, modeNeedsLead } from '../../js/team/defaults.js'
import { isTemplateId, getTemplate } from '../../js/data/templates.js'
import { createTeamFromTemplate, getTeam, teamsStore } from '../../js/stores/teams-store.js'
import { libraryStore, listAgents } from '../../js/stores/library-store.js'

beforeEach(() => {
  teamsStore.setState({ teams: [], loaded: true })
  libraryStore.setState({ agents: [], loaded: true })
})

describe('the catalogue', () => {
  it('ships one team per shape worth showing', () => {
    expect(TEAM_TEMPLATES.map((team) => team.id)).toEqual([
      'marketing',
      'quality',
      'editorial',
      'data',
      'accounting',
      'tax',
    ])

    expect(getTeamTemplate('marketing')).toMatchObject({ label: 'Time de Marketing', mode: 'managed' })
    expect(getTeamTemplate('quality')).toMatchObject({ label: 'Plantão de Qualidade', mode: 'chain' })
    expect(getTeamTemplate('editorial')).toMatchObject({ label: 'Mesa de Revisão', mode: 'review' })
    expect(getTeamTemplate('accounting')).toMatchObject({ label: 'Time de Contabilidade', mode: 'chain' })
    expect(getTeamTemplate('tax')).toMatchObject({ label: 'Time Fiscal', mode: 'review' })
    expect(getTeamTemplate('data')).toMatchObject({ label: 'Time de Dados', mode: 'chain' })
  })

  it('gives a lead exactly to the teams whose mode needs one', () => {
    for (const team of TEAM_TEMPLATES) {
      if (modeNeedsLead(team.mode)) expect(team.lead, team.id).toBeTruthy()
      else expect(team.lead, team.id).toBeUndefined()
    }
  })

  it('names only agent templates that exist', () => {
    // A typo here would silently drop a member instead of failing, which is the
    // same trap templates.test.js guards for the agent catalogue.
    for (const team of TEAM_TEMPLATES) {
      for (const member of team.members) {
        expect(isTemplateId(member.template), `${team.id}: ${member.template}`).toBe(true)
      }
    }
  })

  it('makes the lead somebody who is actually on the team', () => {
    for (const team of TEAM_TEMPLATES) {
      if (!modeNeedsLead(team.mode)) continue
      expect(team.members.some((member) => member.template === team.lead), team.id).toBe(true)
    }
  })

  it('seats nobody twice and stays under the ceiling', () => {
    for (const team of TEAM_TEMPLATES) {
      const templates = team.members.map((member) => member.template)
      expect(new Set(templates).size, team.id).toBe(templates.length)
      expect(templates.length, team.id).toBeLessThanOrEqual(TEAM_LIMITS.maxMembers)
    }
  })

  it('gives every team a known mode, a goal and an order for each member', () => {
    for (const team of TEAM_TEMPLATES) {
      expect(TEAM_MODE_IDS).toContain(team.mode)
      expect(team.objective.trim().length, team.id).toBeGreaterThan(0)
      expect(team.tagline.trim().length, team.id).toBeGreaterThan(0)
      for (const member of team.members) {
        expect(member.instruction.trim().length, `${team.id}: ${member.template}`).toBeGreaterThan(0)
      }
    }
  })

  it('says nothing in the interface with an em dash', () => {
    for (const team of TEAM_TEMPLATES) {
      const copy = [team.label, team.tagline, team.objective, ...team.members.map((m) => m.instruction)]
      expect(copy.join(' '), team.id).not.toContain('—')
    }
  })
})

describe('creating the example team', () => {
  it('mints a real agent per member and seats them in order', () => {
    const team = createTeamFromTemplate('marketing')
    const template = getTeamTemplate('marketing')

    expect(team).not.toBeNull()
    expect(listAgents()).toHaveLength(4)
    expect(team?.members).toHaveLength(4)

    // Seat order follows the template, and each seat carries its own order.
    team?.members.forEach((member, index) => {
      expect(member.instruction).toBe(template?.members[index].instruction)
    })
  })

  it('seats the agents it just created, not template ids', () => {
    const team = /** @type {import('../../js/team/types.js').Team} */ (
      createTeamFromTemplate('marketing')
    )
    const ids = new Set(listAgents().map((agent) => agent.id))

    for (const member of team.members) {
      expect(ids.has(member.agentId), member.agentId).toBe(true)
    }
  })

  it('puts the marketing manager in the chair', () => {
    const team = /** @type {import('../../js/team/types.js').Team} */ (
      createTeamFromTemplate('marketing')
    )
    const manager = listAgents().find((agent) => agent.id === team.leadId)

    expect(manager?.name).toBe(getTemplate('marketing-manager')?.agent.name)
  })

  it('builds the assembly line in order, with nobody singled out', () => {
    const team = /** @type {import('../../js/team/types.js').Team} */ (
      createTeamFromTemplate('quality')
    )
    const names = team.members.map(
      (member) => listAgents().find((agent) => agent.id === member.agentId)?.name
    )

    expect(team.mode).toBe('chain')
    expect(team.leadId).toBeNull()
    // Desk order is the running order under chain, so it has to survive creation.
    expect(names).toEqual(['Triador de Bugs', 'Analista de QA', 'Revisor de Código', 'Companheiro de Plantão'])
  })

  it('puts the brand guardian in the evaluator seat', () => {
    const team = /** @type {import('../../js/team/types.js').Team} */ (
      createTeamFromTemplate('editorial')
    )
    const evaluator = listAgents().find((agent) => agent.id === team.leadId)

    expect(team.mode).toBe('review')
    expect(evaluator?.name).toBe(getTemplate('brand-voice')?.agent.name)
  })

  it('carries the goal and the mode over', () => {
    const team = /** @type {import('../../js/team/types.js').Team} */ (
      createTeamFromTemplate('marketing')
    )

    expect(team.name).toBe('Time de Marketing')
    expect(team.mode).toBe('managed')
    expect(team.objective).toBe(getTeamTemplate('marketing')?.objective)
  })

  it('stores the team so it survives the navigation that follows', () => {
    const team = /** @type {import('../../js/team/types.js').Team} */ (
      createTeamFromTemplate('marketing')
    )

    expect(getTeam(team.id)).toBeDefined()
  })

  it('gives an independent copy each time, like the agent templates do', () => {
    const first = /** @type {import('../../js/team/types.js').Team} */ (
      createTeamFromTemplate('marketing')
    )
    const second = /** @type {import('../../js/team/types.js').Team} */ (
      createTeamFromTemplate('marketing')
    )

    expect(second.id).not.toBe(first.id)
    expect(listAgents()).toHaveLength(8)
    // No agent is shared between the two copies.
    const firstIds = new Set(first.members.map((member) => member.agentId))
    for (const member of second.members) expect(firstIds.has(member.agentId)).toBe(false)
  })

  it('builds the accounting line from lançamento to fechamento', () => {
    const team = /** @type {import('../../js/team/types.js').Team} */ (
      createTeamFromTemplate('accounting')
    )
    const names = team.members.map(
      (member) => listAgents().find((agent) => agent.id === member.agentId)?.name
    )

    expect(team.mode).toBe('chain')
    expect(team.leadId).toBeNull()
    expect(names).toEqual(['Analista Contábil', 'Analista de Dados', 'Controller'])
  })

  it('puts the tax auditor in the evaluator seat, not the one who apurou', () => {
    const team = /** @type {import('../../js/team/types.js').Team} */ (
      createTeamFromTemplate('tax')
    )
    const evaluator = listAgents().find((agent) => agent.id === team.leadId)

    expect(team.mode).toBe('review')
    expect(evaluator?.name).toBe(getTemplate('tax-auditor')?.agent.name)
  })

  it('builds the data pipeline in the order the work happens', () => {
    const team = /** @type {import('../../js/team/types.js').Team} */ (
      createTeamFromTemplate('data')
    )
    const names = team.members.map(
      (member) => listAgents().find((agent) => agent.id === member.agentId)?.name
    )

    expect(team.mode).toBe('chain')
    // Mapear vem antes de transformar, e conferir antes de desenhar o painel.
    expect(names).toEqual([
      'Mapeador de Dados',
      'Engenheiro de Dados',
      'Analista de Dados',
      'Designer de Dashboards',
    ])
  })

  it('refuses an id the catalogue does not have', () => {
    expect(createTeamFromTemplate('nao-existe')).toBeNull()
    expect(listAgents()).toHaveLength(0)
  })
})
