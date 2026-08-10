import { describe, expect, it } from 'vitest'
import { canExport, getExportBlockers, LIMITS, validateAgent, validateField } from '../../js/agent/validate.js'
import { createAgentFromTemplate, createEmptyAgent } from '../../js/agent/defaults.js'

const createStarterAgent = () => createAgentFromTemplate('sales-email')

describe('validateField', () => {
  it('enforces the SPEC 17 name bounds', () => {
    expect(validateField('name', '')).toMatch(/Dê um nome/)
    expect(validateField('name', 'a')).toMatch(/pelo menos 2/)
    expect(validateField('name', 'ok')).toBeNull()
    expect(validateField('name', 'x'.repeat(LIMITS.nameMax))).toBeNull()
    expect(validateField('name', 'x'.repeat(LIMITS.nameMax + 1))).toMatch(/no máximo 100/)
  })

  it('caps description at 160 and objective at 500 (SPEC 17, 18)', () => {
    expect(validateField('description', 'x'.repeat(160))).toBeNull()
    expect(validateField('description', 'x'.repeat(161))).toMatch(/160/)
    expect(validateField('objective', 'x'.repeat(500))).toBeNull()
    expect(validateField('objective', 'x'.repeat(501))).toMatch(/500/)
  })

  it('ignores surrounding whitespace when measuring', () => {
    expect(validateField('name', '   ab   ')).toBeNull()
    expect(validateField('name', '     ')).toMatch(/Dê um nome/)
  })
})

describe('validateAgent', () => {
  it('accepts a fully configured agent', () => {
    expect(validateAgent(createStarterAgent())).toEqual({ ok: true, errors: {} })
  })

  it('reports a missing name and objective', () => {
    const result = validateAgent(createEmptyAgent())
    expect(result.ok).toBe(false)
    expect(result.errors.name).toBeDefined()
    expect(result.errors.objective).toBeDefined()
  })

  it('rejects more tones or traits than allowed', () => {
    const agent = createStarterAgent()
    agent.personality.tones = ['a', 'b', 'c', 'd']
    agent.personality.traits = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    const { errors } = validateAgent(agent)
    expect(errors['personality.tones']).toMatch(/no máximo 3/)
    expect(errors['personality.traits']).toMatch(/no máximo 6/)
  })

  it('rejects slider values outside 0-100', () => {
    const agent = createStarterAgent()
    agent.personality.creativity = 140
    expect(validateAgent(agent).errors['personality.creativity']).toBeDefined()
  })
})

describe('getExportBlockers', () => {
  it('blocks only on name and objective (SPEC 50)', () => {
    const blockers = getExportBlockers(createEmptyAgent())
    expect(blockers.map((blocker) => blocker.step)).toEqual(['identity', 'objective'])
  })

  it('clears once both are present, regardless of anything else', () => {
    const agent = createEmptyAgent({
      name: 'Mínimo',
      objective: 'Fazer algo',
      hardRules: [],
      tools: [],
    })
    expect(getExportBlockers(agent)).toEqual([])
    expect(canExport(agent)).toBe(true)
  })

  it('does not accept whitespace as an objective', () => {
    const agent = createEmptyAgent({ name: 'Nome', objective: '    ' })
    expect(canExport(agent)).toBe(false)
  })
})
