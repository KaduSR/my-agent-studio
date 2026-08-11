import { describe, expect, it } from 'vitest'
import { createToolCatalogue, mergeToolCatalogue } from '../../js/agent/tool-catalogue.js'
import { TOOLS } from '../../js/data/tools.js'

/**
 * @param {ReadonlyArray<import('../../js/agent/types.js').AgentTool>} tools
 * @param {string} id
 */
const find = (tools, id) => tools.find((tool) => tool.id === id)

describe('createToolCatalogue', () => {
  it('is the whole catalogue, off, with each tool at its own default', () => {
    const tools = createToolCatalogue()
    expect(tools).toHaveLength(TOOLS.length)
    expect(tools.every((tool) => tool.enabled === false)).toBe(true)
    expect(find(tools, 'terminal')?.permission).toBe('ask')
    expect(find(tools, 'web-search')?.permission).toBe('auto')
  })
})

describe('mergeToolCatalogue', () => {
  /**
   * The reason this function exists. A record written when the catalogue was
   * smaller must gain what shipped since, or those tools simply do not exist
   * for that agent — with no error anywhere to notice.
   */
  it('adds tools the stored record never heard of', () => {
    const merged = mergeToolCatalogue([
      { id: 'web-search', name: 'Web Search', enabled: true, purpose: 'Conferir fatos.' },
      { id: 'terminal', name: 'Terminal', enabled: false },
    ])

    expect(merged).toHaveLength(TOOLS.length)
    expect(find(merged, 'web-search')?.enabled).toBe(true)
    expect(find(merged, 'web-search')?.purpose).toBe('Conferir fatos.')
    expect(find(merged, 'mcp')?.enabled).toBe(false)
  })

  it('keeps configuration, including a permission the user changed', () => {
    const merged = mergeToolCatalogue([
      {
        id: 'terminal',
        name: 'Terminal',
        enabled: true,
        permission: 'read-only',
        rules: ['Explicar o comando antes de executar'],
      },
    ])

    const terminal = find(merged, 'terminal')
    expect(terminal?.permission).toBe('read-only')
    expect(terminal?.rules).toEqual(['Explicar o comando antes de executar'])
  })

  it('ignores a permission that is not one of the three', () => {
    const merged = mergeToolCatalogue([
      { id: 'terminal', name: 'Terminal', enabled: true, permission: 'sudo' },
    ])
    expect(find(merged, 'terminal')?.permission).toBe('ask')
  })

  it('reads a bare list of ids as "these are on"', () => {
    const merged = mergeToolCatalogue(['files', 'git'])
    expect(find(merged, 'files')?.enabled).toBe(true)
    expect(find(merged, 'git')?.enabled).toBe(true)
    expect(find(merged, 'terminal')?.enabled).toBe(false)
  })

  it('treats config.json entries, which have no flag, as enabled', () => {
    const merged = mergeToolCatalogue([{ id: 'email', name: 'Email', purpose: 'Redigir.' }])
    expect(find(merged, 'email')?.enabled).toBe(true)
  })

  /** The whole point of the `custom` flag: telling a typo from a declaration. */
  it('keeps a custom tool and drops an unknown id that is not one', () => {
    const merged = mergeToolCatalogue([
      { id: 'custom-mcp-do-time', name: 'MCP do time', enabled: true, custom: true, description: 'Interno.' },
      { id: 'ferramenta-que-nao-existe', name: 'Fantasma', enabled: true },
    ])

    expect(merged).toHaveLength(TOOLS.length + 1)
    const custom = find(merged, 'custom-mcp-do-time')
    expect(custom?.custom).toBe(true)
    expect(custom?.description).toBe('Interno.')
    expect(find(merged, 'ferramenta-que-nao-existe')).toBeUndefined()
  })

  it('puts custom tools after the catalogue, so the grid order is stable', () => {
    const merged = mergeToolCatalogue([
      { id: 'custom-a', name: 'A', custom: true },
      { id: 'web-search', name: 'Web Search', enabled: true },
    ])
    expect(merged[merged.length - 1].id).toBe('custom-a')
  })

  it('refuses a custom tool with no name, which nothing could render', () => {
    const merged = mergeToolCatalogue([{ id: 'custom-x', custom: true, enabled: true }])
    expect(merged).toHaveLength(TOOLS.length)
  })

  it('never duplicates a custom id', () => {
    const merged = mergeToolCatalogue([
      { id: 'custom-a', name: 'A', custom: true },
      { id: 'custom-a', name: 'A de novo', custom: true },
    ])
    expect(merged.filter((tool) => tool.id === 'custom-a')).toHaveLength(1)
  })

  it('falls back to the full catalogue for anything that is not a list', () => {
    expect(mergeToolCatalogue(null)).toHaveLength(TOOLS.length)
    expect(mergeToolCatalogue('web-search')).toHaveLength(TOOLS.length)
  })
})
