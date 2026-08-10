import { describe, expect, it, vi } from 'vitest'
import { createStore, shallowEqual } from '../../js/lib/store.js'
import { matchRoute, normalizeHash } from '../../js/router.js'
import { slugify } from '../../js/lib/uuid.js'

describe('shallowEqual', () => {
  it('compares primitives, arrays and flat objects', () => {
    expect(shallowEqual(1, 1)).toBe(true)
    expect(shallowEqual('a', 'b')).toBe(false)
    expect(shallowEqual([1, 2], [1, 2])).toBe(true)
    expect(shallowEqual([1, 2], [2, 1])).toBe(false)
    expect(shallowEqual({ a: 1 }, { a: 1 })).toBe(true)
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
  })

  it('is shallow: nested objects compare by reference', () => {
    expect(shallowEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(false)
    const nested = { b: 1 }
    expect(shallowEqual({ a: nested }, { a: nested })).toBe(true)
  })

  it('does not confuse an array with an object', () => {
    expect(shallowEqual([], {})).toBe(false)
  })
})

describe('createStore', () => {
  it('merges partial updates', () => {
    const store = createStore({ a: 1, b: 2 })
    store.setState({ b: 3 })
    expect(store.getState()).toEqual({ a: 1, b: 3 })
  })

  it('accepts an updater function', () => {
    const store = createStore({ count: 0 })
    store.setState((state) => ({ count: state.count + 1 }))
    expect(store.getState().count).toBe(1)
  })

  it('does not notify when nothing actually changed', () => {
    const store = createStore({ a: 1 })
    const listener = vi.fn()
    store.subscribe(listener)
    store.setState({ a: 1 })
    expect(listener).not.toHaveBeenCalled()
  })

  it('stops notifying after unsubscribe', () => {
    const store = createStore({ a: 1 })
    const listener = vi.fn()
    const off = store.subscribe(listener)
    store.setState({ a: 2 })
    off()
    store.setState({ a: 3 })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  describe('select', () => {
    it('only fires when the selected slice changes', () => {
      const store = createStore({ name: 'a', other: 1 })
      const listener = vi.fn()
      store.select((state) => state.name, listener)

      store.setState({ other: 2 })
      expect(listener).not.toHaveBeenCalled()

      store.setState({ name: 'b' })
      expect(listener).toHaveBeenCalledWith('b', 'a')
    })

    it('treats an equal derived object as unchanged', () => {
      const store = createStore({ a: 1, b: 1 })
      const listener = vi.fn()
      store.select((state) => ({ sum: state.a + state.b }), listener)

      // 1+1 and 2+0 both derive to 2, so the subscriber must stay quiet.
      store.setState({ a: 2, b: 0 })
      expect(listener).not.toHaveBeenCalled()

      store.setState({ a: 5 })
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('can run immediately on subscribe', () => {
      const store = createStore({ a: 7 })
      const listener = vi.fn()
      store.select((state) => state.a, listener, { immediate: true })
      expect(listener).toHaveBeenCalledWith(7, 7)
    })
  })
})

describe('router', () => {
  it('normalises every hash shape to a clean path', () => {
    expect(normalizeHash('')).toBe('/')
    expect(normalizeHash('#')).toBe('/')
    expect(normalizeHash('#/')).toBe('/')
    expect(normalizeHash('#/studio/')).toBe('/studio')
    expect(normalizeHash('studio/new')).toBe('/studio/new')
  })

  it('maps the SPEC 94 routes', () => {
    expect(matchRoute('/')).toEqual({ name: 'home', params: {} })
    expect(matchRoute('/studio')).toEqual({ name: 'library', params: {} })
    expect(matchRoute('/studio/new')).toEqual({ name: 'new', params: {} })
    expect(matchRoute('/studio/abc-123')).toEqual({ name: 'edit', params: { id: 'abc-123' } })
    expect(matchRoute('/nope').name).toBe('not-found')
  })

  it('decodes ids and does not mistake a nested path for one', () => {
    expect(matchRoute('/studio/a%20b').params.id).toBe('a b')
    expect(matchRoute('/studio/a/b').name).toBe('not-found')
  })
})

describe('slugify', () => {
  it('strips accents, lowercases and collapses separators', () => {
    expect(slugify('Assistente de Aprendizado')).toBe('assistente-de-aprendizado')
    expect(slugify('Ação & Memória!!')).toBe('acao-memoria')
    expect(slugify('  --Olá--  ')).toBe('ola')
  })

  it('falls back when nothing usable remains', () => {
    expect(slugify('###')).toBe('meu-agente')
    expect(slugify('', 'agente')).toBe('agente')
  })
})
