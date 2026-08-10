import { beforeEach, describe, expect, it } from 'vitest'
import {
  addRestriction,
  addRule,
  builderStore,
  getAgent,
  goToNextStep,
  goToPreviousStep,
  loadAgent,
  moveRule,
  removeRestriction,
  removeRule,
  setMemoryType,
  setSlider,
  setStep,
  toggleRemember,
  toggleTone,
  toggleTool,
  toggleTrait,
  undoRemoveRule,
  updateAgentFields,
  updateRuleText,
} from '../../js/stores/builder-store.js'
import { createEmptyAgent } from '../../js/agent/defaults.js'

const ruleTexts = () =>
  [...getAgent().guardRails].sort((a, b) => a.order - b.order).map((rule) => rule.text)

beforeEach(() => {
  loadAgent(createEmptyAgent())
})

describe('navigation', () => {
  it('walks forward and back without falling off either end', () => {
    expect(builderStore.getState().step).toBe('identity')
    goToPreviousStep()
    expect(builderStore.getState().step).toBe('identity')

    for (let i = 0; i < 10; i += 1) goToNextStep()
    expect(builderStore.getState().step).toBe('export')

    goToPreviousStep()
    expect(builderStore.getState().step).toBe('memory')
  })

  it('sets a step directly', () => {
    setStep('tools')
    expect(builderStore.getState().step).toBe('tools')
  })
})

describe('immutability', () => {
  it('replaces the agent rather than mutating it', () => {
    const before = getAgent()
    updateAgentFields({ name: 'Novo' })
    expect(getAgent()).not.toBe(before)
    expect(before.name).toBe('')
  })

  it('bumps updatedAt on a real change', async () => {
    const before = getAgent().updatedAt
    await new Promise((resolve) => setTimeout(resolve, 2))
    updateAgentFields({ name: 'Alterado' })
    expect(getAgent().updatedAt >= before).toBe(true)
  })

  it('ignores a write that changes nothing', () => {
    updateAgentFields({ name: 'Igual' })
    const snapshot = getAgent()
    updateAgentFields({ name: 'Igual' })
    expect(getAgent()).toBe(snapshot)
  })
})

describe('personality ceilings', () => {
  it('accepts three tones and refuses the fourth (SPEC 23)', () => {
    expect(toggleTone('friendly')).toBe(true)
    expect(toggleTone('didactic')).toBe(true)
    expect(toggleTone('calm')).toBe(true)
    expect(toggleTone('creative')).toBe(false)
    expect(getAgent().personality.tones).toEqual(['friendly', 'didactic', 'calm'])
  })

  it('frees a slot when a tone is unselected', () => {
    toggleTone('friendly')
    toggleTone('didactic')
    toggleTone('calm')
    expect(toggleTone('didactic')).toBe(true)
    expect(toggleTone('creative')).toBe(true)
    expect(getAgent().personality.tones).toEqual(['friendly', 'calm', 'creative'])
  })

  it('caps traits at six (SPEC 25)', () => {
    const ids = ['empathetic', 'patient', 'curious', 'analytical', 'practical', 'didactic']
    for (const id of ids) expect(toggleTrait(id)).toBe(true)
    expect(toggleTrait('precise')).toBe(false)
  })
})

describe('sliders', () => {
  it('clamps and rounds', () => {
    setSlider('creativity', 140)
    expect(getAgent().personality.creativity).toBe(100)
    setSlider('creativity', -20)
    expect(getAgent().personality.creativity).toBe(0)
    setSlider('creativity', 42.6)
    expect(getAgent().personality.creativity).toBe(43)
  })
})

describe('hard rules', () => {
  it('adds rules and keeps order contiguous', () => {
    addRule('primeira')
    addRule('segunda')
    expect(ruleTexts()).toEqual([
      'Nunca invente informações.',
      'Se não souber algo, diga explicitamente.',
      'Priorize clareza e objetividade.',
      'Proteja informações privadas do usuário.',
      'primeira',
      'segunda',
    ])
    expect(getAgent().guardRails.map((rule) => rule.order)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('ignores an empty rule', () => {
    const before = getAgent().guardRails.length
    addRule('   ')
    expect(getAgent().guardRails).toHaveLength(before)
  })

  it('edits a rule in place', () => {
    const id = getAgent().guardRails[0].id
    updateRuleText(id, 'texto novo')
    expect(ruleTexts()[0]).toBe('texto novo')
  })

  it('moves a rule down and renumbers', () => {
    moveRule(0, 2)
    expect(ruleTexts()).toEqual([
      'Se não souber algo, diga explicitamente.',
      'Priorize clareza e objetividade.',
      'Nunca invente informações.',
      'Proteja informações privadas do usuário.',
    ])
    expect(getAgent().guardRails.map((rule) => rule.order)).toEqual([0, 1, 2, 3])
  })

  it('moves a rule up', () => {
    moveRule(3, 0)
    expect(ruleTexts()[0]).toBe('Proteja informações privadas do usuário.')
  })

  it('ignores out-of-range and no-op moves', () => {
    const before = ruleTexts()
    moveRule(0, 0)
    moveRule(-1, 2)
    moveRule(0, 99)
    expect(ruleTexts()).toEqual(before)
  })

  it('restores a removed rule at its original index (SPEC 58)', () => {
    const target = getAgent().guardRails[1]
    removeRule(target.id)
    expect(ruleTexts()).not.toContain(target.text)

    expect(undoRemoveRule()).toBe(true)
    expect(ruleTexts()[1]).toBe(target.text)
    expect(getAgent().guardRails.map((rule) => rule.order)).toEqual([0, 1, 2, 3])
  })

  it('undo is a no-op when nothing was removed', () => {
    expect(undoRemoveRule()).toBe(false)
  })
})

describe('tools', () => {
  it('toggles a tool without losing its configuration', () => {
    toggleTool('web-search')
    expect(getAgent().tools.find((tool) => tool.id === 'web-search')?.enabled).toBe(true)
    toggleTool('web-search')
    expect(getAgent().tools.find((tool) => tool.id === 'web-search')?.enabled).toBe(false)
    // Every tool stays in the list so purpose/rules survive a round trip.
    expect(getAgent().tools).toHaveLength(10)
  })
})

describe('memory', () => {
  it('changes type and toggles remembered items', () => {
    setMemoryType('persistent')
    expect(getAgent().memory.type).toBe('persistent')

    toggleRemember('projects')
    expect(getAgent().memory.remember).toEqual(['projects'])
    toggleRemember('projects')
    expect(getAgent().memory.remember).toEqual([])
  })

  it('starts with the SPEC 77 restrictions and can add or remove', () => {
    expect(getAgent().memory.restrictions).toEqual([
      'Nunca armazenar senhas.',
      'Nunca armazenar tokens.',
      'Nunca armazenar credenciais.',
      'Respeitar pedidos de esquecimento.',
    ])

    addRestriction('Nunca armazenar CPF')
    expect(getAgent().memory.restrictions).toHaveLength(5)

    // Duplicates are rejected.
    addRestriction('Nunca armazenar CPF')
    expect(getAgent().memory.restrictions).toHaveLength(5)

    removeRestriction(0)
    expect(getAgent().memory.restrictions[0]).toBe('Nunca armazenar tokens.')
  })
})
