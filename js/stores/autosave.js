// @ts-check
/**
 * Autosave (SPEC 57, 97, 98).
 *
 * There is deliberately no Save button. Every change lands in localStorage
 * 500ms after the user stops typing.
 *
 * An agent starts life in the draft slot. The moment it has a real name it is
 * promoted into the library and given its own URL, so "Meus agentes" is always
 * an honest reflection of what exists — and a refresh never loses work.
 */

import { debounce } from '../lib/debounce.js'
import { STORAGE_KEYS, readJSON, removeKey, writeJSON } from '../lib/storage.js'
import { builderStore, setSaveStatus } from './builder-store.js'
import { saveAgent } from './library-store.js'
import { LIMITS } from '../agent/validate.js'

export const AUTOSAVE_DELAY = 500

/** True once the current agent lives in the library rather than the draft slot. */
let persisted = false

/**
 * @param {boolean} value
 * @returns {void}
 */
export function setPersisted(value) {
  persisted = value
}

/** @returns {boolean} */
export function isPersisted() {
  return persisted
}

/**
 * @param {import('../agent/types.js').Agent} agent
 * @returns {boolean}
 */
function readyForLibrary(agent) {
  return agent.name.trim().length >= LIMITS.nameMin
}

/**
 * Start persisting builder changes.
 * @param {Object} [options]
 * @param {(agent: import('../agent/types.js').Agent) => void} [options.onPromote]
 *   Called the first time an agent earns its place in the library.
 * @returns {() => void} Stop autosaving.
 */
export function startAutosave(options = {}) {
  const flush = debounce(() => {
    const agent = builderStore.getState().agent

    if (readyForLibrary(agent)) {
      const result = saveAgent(agent)
      if (!result.ok) {
        setSaveStatus(
          'error',
          result.reason === 'quota'
            ? 'Armazenamento cheio. Exporte seu agente para não perder alterações.'
            : 'Não foi possível salvar automaticamente. Exporte seu agente para evitar perder alterações.'
        )
        return
      }

      if (!persisted) {
        persisted = true
        /*
         * Only discard the draft when the agent being promoted *is* the draft.
         * An agent that arrived already named — from a template, say — must not
         * wipe an unrelated draft someone left half-written, which is exactly
         * what an unconditional remove used to do.
         */
        const draft = readJSON(
          STORAGE_KEYS.draft,
          /** @type {{ id?: string } | null} */ (null)
        )
        if (draft?.id === agent.id) removeKey(STORAGE_KEYS.draft)
        options.onPromote?.(agent)
      }
      setSaveStatus('saved')
      return
    }

    const result = writeJSON(STORAGE_KEYS.draft, agent)
    setSaveStatus(
      result.ok ? 'saved' : 'error',
      result.ok
        ? null
        : 'Não foi possível salvar automaticamente. Exporte seu agente para evitar perder alterações.'
    )
  }, AUTOSAVE_DELAY)

  const unsubscribe = builderStore.select(
    (state) => state.agent,
    () => {
      setSaveStatus('saving')
      flush()
    }
  )

  return () => {
    flush.cancel()
    unsubscribe()
  }
}
