// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTOSAVE_DELAY, setPersisted, startAutosave } from '../../js/stores/autosave.js'
import { builderStore, loadAgent, updateAgentFields } from '../../js/stores/builder-store.js'
import {
  libraryStore,
  loadLibrary,
  reviveAgent,
  saveAgent,
} from '../../js/stores/library-store.js'
import { STORAGE_KEYS, readJSON, writeJSON, isStorageAvailable } from '../../js/lib/storage.js'
import { createEmptyAgent } from '../../js/agent/defaults.js'

/** Read the draft slot with a concrete type, so field access type-checks. */
function readDraft() {
  return /** @type {import('../../js/agent/types.js').Agent | null} */ (
    readJSON(STORAGE_KEYS.draft, null)
  )
}

/** @type {() => void} */
let stop

beforeEach(() => {
  vi.useFakeTimers()
  libraryStore.setState({ agents: [], loaded: false })
  loadAgent(createEmptyAgent())
  setPersisted(false)
  stop = startAutosave()
})

afterEach(() => {
  stop()
  vi.useRealTimers()
})

describe('autosave (SPEC 57, 97)', () => {
  it('waits for the debounce window before writing', () => {
    updateAgentFields({ objective: 'algo' })
    expect(builderStore.getState().saveStatus).toBe('saving')

    vi.advanceTimersByTime(AUTOSAVE_DELAY - 1)
    expect(readJSON(STORAGE_KEYS.draft, null)).toBeNull()

    vi.advanceTimersByTime(1)
    expect(builderStore.getState().saveStatus).toBe('saved')
    expect(readDraft()?.objective).toBe('algo')
  })

  it('collapses a burst of edits into one write', () => {
    for (const value of ['a', 'ab', 'abc', 'abcd']) {
      updateAgentFields({ objective: value })
      vi.advanceTimersByTime(100)
    }
    vi.advanceTimersByTime(AUTOSAVE_DELAY)

    expect(readDraft()?.objective).toBe('abcd')
  })

  it('keeps an unnamed agent in the draft slot, out of the library', () => {
    updateAgentFields({ objective: 'sem nome ainda' })
    vi.advanceTimersByTime(AUTOSAVE_DELAY)

    expect(readJSON(STORAGE_KEYS.draft, null)).not.toBeNull()
    expect(loadLibrary()).toHaveLength(0)
  })

  it('promotes the agent into the library once it has a name', () => {
    const onPromote = vi.fn()
    stop()
    setPersisted(false)
    stop = startAutosave({ onPromote })

    updateAgentFields({ name: 'Nomeado' })
    vi.advanceTimersByTime(AUTOSAVE_DELAY)

    expect(onPromote).toHaveBeenCalledTimes(1)
    expect(loadLibrary().map((agent) => agent.name)).toEqual(['Nomeado'])
    // The draft slot is cleared so it cannot be restored as a second agent.
    expect(readJSON(STORAGE_KEYS.draft, null)).toBeNull()
  })

  it('promotes only once, then keeps updating the same record', () => {
    const onPromote = vi.fn()
    stop()
    setPersisted(false)
    stop = startAutosave({ onPromote })

    updateAgentFields({ name: 'Primeiro' })
    vi.advanceTimersByTime(AUTOSAVE_DELAY)
    updateAgentFields({ name: 'Segundo' })
    vi.advanceTimersByTime(AUTOSAVE_DELAY)

    expect(onPromote).toHaveBeenCalledTimes(1)
    expect(loadLibrary()).toHaveLength(1)
    expect(loadLibrary()[0].name).toBe('Segundo')
  })

  it('reports a storage failure instead of losing work silently (SPEC 98)', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })

    updateAgentFields({ name: 'Falha' })
    vi.advanceTimersByTime(AUTOSAVE_DELAY)

    expect(builderStore.getState().saveStatus).toBe('error')
    expect(builderStore.getState().saveError).toMatch(/Exporte seu agente/)
    setItem.mockRestore()
  })
})

describe('storage layer', () => {
  it('round-trips JSON', () => {
    expect(writeJSON('probe', { a: 1 })).toEqual({ ok: true })
    expect(readJSON('probe', null)).toEqual({ a: 1 })
  })

  it('falls back when the stored value is corrupt', () => {
    localStorage.setItem('broken', '{not json')
    expect(readJSON('broken', 'fallback')).toBe('fallback')
  })

  it('reports availability', () => {
    expect(isStorageAvailable()).toBe(true)
  })

  it('classifies a quota failure', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(writeJSON('x', {})).toMatchObject({ ok: false, reason: 'quota' })
    setItem.mockRestore()
  })
})

describe('migration from the pre-Guard-Rails schema', () => {
  /** An agent exactly as an older version of the app would have written it. */
  const legacyAgent = () => ({
    id: 'legacy-1',
    name: 'Agente Antigo',
    objective: 'Existia antes do rename.',
    hardRules: [
      { id: 'r1', text: 'Regra que não pode desaparecer.', order: 0 },
      { id: 'r2', text: 'Nem esta.', order: 1 },
    ],
  })

  it('reads legacy hardRules back as guardRails, losing nothing', () => {
    localStorage.setItem(STORAGE_KEYS.agents, JSON.stringify([legacyAgent()]))

    const [agent] = loadLibrary()
    expect(agent.guardRails.map((rule) => rule.text)).toEqual([
      'Regra que não pode desaparecer.',
      'Nem esta.',
    ])
  })

  it('does not carry the legacy key back into storage', () => {
    localStorage.setItem(STORAGE_KEYS.agents, JSON.stringify([legacyAgent()]))

    const [agent] = loadLibrary()
    expect('hardRules' in agent).toBe(false)

    // Round-tripping through a save must not resurrect it either.
    saveAgent(agent)
    const stored = readJSON(STORAGE_KEYS.agents, /** @type {unknown} */ (null))
    expect(JSON.stringify(stored)).not.toContain('hardRules')
  })

  it('revives a legacy draft too, not just the library', () => {
    // The draft is read on a different code path; before this it was returned raw.
    const draft = reviveAgent(legacyAgent())
    expect(draft?.guardRails).toHaveLength(2)
    // And it is completed, not just renamed.
    expect(draft?.tools).toHaveLength(10)
    expect(draft?.personality.tones).toEqual([])
  })

  it('prefers the new key when a record somehow carries both', () => {
    const agent = reviveAgent({
      ...legacyAgent(),
      guardRails: [{ id: 'new', text: 'Formato novo ganha.', order: 0 }],
    })
    expect(agent?.guardRails.map((rule) => rule.text)).toEqual(['Formato novo ganha.'])
  })
})

describe('library recovery', () => {
  it('drops unreadable records rather than crashing the list', () => {
    localStorage.setItem(
      STORAGE_KEYS.agents,
      JSON.stringify([{ id: 'ok', name: 'Bom' }, null, 'lixo', { name: 'sem id' }])
    )
    const agents = loadLibrary()
    expect(agents).toHaveLength(1)
    expect(agents[0].name).toBe('Bom')
    // The revived record is complete, not the partial object that was stored.
    expect(agents[0].personality.tones).toEqual([])
    expect(agents[0].tools).toHaveLength(10)
  })
})
