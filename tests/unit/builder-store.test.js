import { beforeEach, describe, expect, it } from 'vitest'
import {
  addCustomTool,
  addKnowledgeDoc,
  addKnowledgeFromLibrary,
  addRestriction,
  addRule,
  applySoulPreset,
  builderStore,
  getAgent,
  goToNextStep,
  goToPreviousStep,
  loadAgent,
  moveKnowledgeDoc,
  moveRule,
  removeCustomTool,
  removeKnowledgeDoc,
  removeRestriction,
  removeRule,
  setMemoryType,
  toggleMemoryKind,
  setSlider,
  setStep,
  setToolPermission,
  toggleRemember,
  toggleTone,
  toggleTool,
  toggleTrait,
  undoRemoveRule,
  updateAgentFields,
  updateKnowledgeDoc,
  updateRuleText,
} from '../../js/stores/builder-store.js'
import { createEmptyAgent } from '../../js/agent/defaults.js'
import { TOOLS } from '../../js/data/tools.js'
import { LIMITS } from '../../js/agent/validate.js'
import { getKnowledgeEntry } from '../../js/data/knowledge-library.js'
import { getSoulPreset } from '../../js/data/soul-presets.js'

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
    expect(getAgent().tools).toHaveLength(TOOLS.length)
  })

  it('carries the catalogue permission by default and takes an override', () => {
    const permissionOf = (/** @type {string} */ id) =>
      getAgent().tools.find((tool) => tool.id === id)?.permission

    // Reading is safe by default; a terminal is not.
    expect(permissionOf('web-search')).toBe('auto')
    expect(permissionOf('terminal')).toBe('ask')

    setToolPermission('terminal', 'read-only')
    expect(permissionOf('terminal')).toBe('read-only')
  })

  it('adds and removes a custom tool, and refuses to remove a catalogue one', () => {
    const id = addCustomTool({ name: 'Servidor MCP do time', description: 'Catálogo interno.' })
    expect(id).toBe('custom-servidor-mcp-do-time')

    const added = getAgent().tools.find((tool) => tool.id === id)
    expect(added?.enabled).toBe(true)
    expect(added?.custom).toBe(true)
    // Nothing is known about what it can do, so it starts cautious.
    expect(added?.permission).toBe('ask')

    // A second tool with the same name earns its own id rather than merging.
    const second = addCustomTool({ name: 'Servidor MCP do time' })
    expect(second).toBe('custom-servidor-mcp-do-time-2')

    expect(addCustomTool({ name: '   ' })).toBeNull()

    removeCustomTool(/** @type {string} */ (id))
    expect(getAgent().tools.some((tool) => tool.id === id)).toBe(false)

    removeCustomTool('terminal')
    expect(getAgent().tools.some((tool) => tool.id === 'terminal')).toBe(true)
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

describe('soul presets', () => {
  it('writes the whole Soul in one revision, so autosave sees one change', () => {
    let notifications = 0
    const unsubscribe = builderStore.subscribe(() => {
      notifications += 1
    })

    expect(applySoulPreset('technical-analyst')).toBe(true)
    unsubscribe()

    expect(notifications).toBe(1)
    expect(getAgent().soul).toEqual(getSoulPreset('technical-analyst')?.soul)
  })

  it('copies the values array, so toggling a chip cannot reach the catalogue', () => {
    applySoulPreset('careful-guardian')
    const preset = /** @type {NonNullable<ReturnType<typeof getSoulPreset>>} */ (
      getSoulPreset('careful-guardian')
    )
    expect(getAgent().soul.values).not.toBe(preset.soul.values)
    expect(getAgent().soul.values).toEqual(preset.soul.values)
  })

  it('replaces the previous preset rather than merging with it', () => {
    applySoulPreset('careful-guardian')
    applySoulPreset('creative-partner')
    expect(getAgent().soul).toEqual(getSoulPreset('creative-partner')?.soul)
  })

  it('reports an unknown id instead of clearing the Soul', () => {
    applySoulPreset('socratic-tutor')
    const before = getAgent().soul
    expect(applySoulPreset('inventada')).toBe(false)
    expect(getAgent().soul).toEqual(before)
  })
})

describe('knowledge', () => {
  it('adds a document the user wrote, trimmed and numbered', () => {
    const id = addKnowledgeDoc({ title: '  Nota  ', content: '  Conteúdo.  ' })
    expect(id).toBeTruthy()
    expect(getAgent().knowledge).toEqual([
      { id, title: 'Nota', content: 'Conteúdo.', order: 0 },
    ])
  })

  it('refuses a document with no title or no content', () => {
    expect(addKnowledgeDoc({ title: '   ', content: 'Conteúdo.' })).toBeNull()
    expect(addKnowledgeDoc({ title: 'Nota', content: '   ' })).toBeNull()
    expect(getAgent().knowledge).toHaveLength(0)
  })

  it('clamps a document to the storage ceilings', () => {
    const id = addKnowledgeDoc({
      title: 'T'.repeat(LIMITS.knowledgeTitleMax + 40),
      content: 'C'.repeat(LIMITS.knowledgeContentMax + 500),
    })
    const doc = getAgent().knowledge.find((entry) => entry.id === id)
    expect(doc?.title).toHaveLength(LIMITS.knowledgeTitleMax)
    expect(doc?.content).toHaveLength(LIMITS.knowledgeContentMax)
  })

  it('copies a catalogue entry and records where it came from', () => {
    const id = addKnowledgeFromLibrary('uncertainty')
    const entry = getKnowledgeEntry('uncertainty')
    const [doc] = getAgent().knowledge

    expect(doc.id).toBe(id)
    expect(doc.title).toBe(entry?.title)
    // Trimmed on the way in, so a catalogue copy and a hand-typed document are
    // stored the same way and both round-trip byte for byte.
    expect(doc.content).toBe(entry?.content.trim())
    expect(doc.sourceId).toBe('uncertainty')
  })

  it('refuses the same catalogue entry twice, and an unknown one', () => {
    expect(addKnowledgeFromLibrary('clear-writing')).toBeTruthy()
    expect(addKnowledgeFromLibrary('clear-writing')).toBeNull()
    expect(addKnowledgeFromLibrary('inventada')).toBeNull()
    expect(getAgent().knowledge).toHaveLength(1)
  })

  it('stops at the ceiling, from both entry points', () => {
    for (let index = 0; index < LIMITS.maxKnowledgeDocs; index += 1) {
      expect(addKnowledgeDoc({ title: `Nota ${index}`, content: 'Conteúdo.' })).toBeTruthy()
    }
    expect(addKnowledgeDoc({ title: 'Uma mais', content: 'Conteúdo.' })).toBeNull()
    expect(addKnowledgeFromLibrary('clear-writing')).toBeNull()
    expect(getAgent().knowledge).toHaveLength(LIMITS.maxKnowledgeDocs)
  })

  it('edits in place and keeps the provenance', () => {
    const id = /** @type {string} */ (addKnowledgeFromLibrary('tone-of-voice'))
    const content = ['# Tom', '', 'Assim.'].join('\n')
    updateKnowledgeDoc(id, { title: 'Tom da casa', content })

    const [doc] = getAgent().knowledge
    expect(doc.title).toBe('Tom da casa')
    expect(doc.content).toBe(content)
    expect(doc.sourceId).toBe('tone-of-voice')
  })

  it('leaves the agent alone when an edit changes nothing', () => {
    const id = /** @type {string} */ (addKnowledgeDoc({ title: 'Nota', content: 'Conteúdo.' }))
    const before = getAgent().knowledge
    updateKnowledgeDoc(id, { title: 'Nota' })
    expect(getAgent().knowledge[0]).toBe(before[0])
  })

  it('removes a document and closes the gap in the order', () => {
    const ids = ['a', 'b', 'c'].map((letter) =>
      addKnowledgeDoc({ title: letter, content: 'Conteúdo.' })
    )
    removeKnowledgeDoc(/** @type {string} */ (ids[1]))

    expect(getAgent().knowledge.map((doc) => doc.title)).toEqual(['a', 'c'])
    expect(getAgent().knowledge.map((doc) => doc.order)).toEqual([0, 1])
  })

  it('ignores a removal for an id it does not have', () => {
    addKnowledgeDoc({ title: 'Nota', content: 'Conteúdo.' })
    const before = getAgent()
    removeKnowledgeDoc('inventada')
    expect(getAgent()).toBe(before)
  })

  it('reorders, and refuses a move that goes off either end', () => {
    for (const letter of ['a', 'b', 'c']) {
      addKnowledgeDoc({ title: letter, content: 'Conteúdo.' })
    }

    moveKnowledgeDoc(2, 0)
    expect(getAgent().knowledge.map((doc) => doc.title)).toEqual(['c', 'a', 'b'])
    expect(getAgent().knowledge.map((doc) => doc.order)).toEqual([0, 1, 2])

    const before = getAgent()
    moveKnowledgeDoc(0, -1)
    moveKnowledgeDoc(0, 3)
    moveKnowledgeDoc(1, 1)
    expect(getAgent()).toBe(before)
  })
})

describe('memory kinds', () => {
  it('starts with the context window and nothing else', () => {
    expect(getAgent().memory.kinds).toEqual(['context-window'])
  })

  it('adds and removes a kind', () => {
    toggleMemoryKind('episodic')
    expect(getAgent().memory.kinds).toContain('episodic')

    toggleMemoryKind('episodic')
    expect(getAgent().memory.kinds).not.toContain('episodic')
  })

  it('refuses to remove the context window', () => {
    // Not a setting: it is how the model works, and a step that let someone
    // switch it off would be teaching something false.
    toggleMemoryKind('context-window')
    expect(getAgent().memory.kinds).toContain('context-window')
  })

  it('leaves the retention type alone', () => {
    setMemoryType('persistent')
    toggleMemoryKind('procedural')

    expect(getAgent().memory.type).toBe('persistent')
    expect(getAgent().memory.kinds).toEqual(['context-window', 'procedural'])
  })
})
