import { describe, expect, it } from 'vitest'
import { PROMPT_TARGETS, generateCreationPrompt, getPromptTarget } from '../../js/agent/prompts.js'
import { buildFileTree } from '../../js/agent/files.js'
import { PRESETS, presetsInFamily } from '../../js/agent/presets.js'
import { createAgentFromTemplate, createEmptyAgent } from '../../js/agent/defaults.js'

const starter = () => createAgentFromTemplate('sales-email')

describe.each(PROMPT_TARGETS.map((target) => [target.id, target]))(
  'prompt for %s',
  (id, target) => {
    it('says where the text goes and what the model should do with it', () => {
      const prompt = generateCreationPrompt(starter(), id)

      expect(prompt).toContain(target.where)
      for (const step of target.steps) {
        expect(prompt).toContain(step)
      }
    })

    it('carries the whole agent, delimited so nothing bleeds into the instructions', () => {
      const prompt = generateCreationPrompt(starter(), id)

      expect(prompt).toContain('<agente>')
      expect(prompt).toContain('</agente>')
      expect(prompt).toContain('Redator de E-mails de Vendas')
      expect(prompt).toContain('## Guard Rails')
      expect(prompt).toContain('## Tools')
      expect(prompt).toContain('## Knowledge')
      // The document sits inside the tags. (The instructions mention them by
      // name too, which is why this looks at the last occurrence.)
      expect(prompt.lastIndexOf('</agente>')).toBeGreaterThan(prompt.indexOf('## Tools'))
      expect(prompt.lastIndexOf('<agente>')).toBeLessThan(prompt.indexOf('## Tools'))
    })

    it('keeps a knowledge document own headings below the section that holds it', () => {
      const prompt = generateCreationPrompt(starter(), id)
      // Guards the case that would flatten the document: a knowledge entry
      // opening with its own h1 must not compete with `## Knowledge`.
      const inside = prompt.slice(prompt.indexOf('## Knowledge'), prompt.indexOf('## Memory'))
      for (const line of inside.split('\n').filter((entry) => entry.startsWith('#'))) {
        expect(line, line).toMatch(/^#{2,6} /)
      }
      expect(inside).toContain('### Ajustar o tom ao público')
    })
  }
)

describe('generateCreationPrompt', () => {
  it('names an unnamed agent rather than leaving a hole in the sentence', () => {
    expect(generateCreationPrompt(createEmptyAgent(), 'chatgpt')).toContain('"Agente sem nome"')
  })

  it('rejects a target it does not know', () => {
    // @ts-expect-error deliberately wrong
    expect(() => generateCreationPrompt(starter(), 'copilot')).toThrow(/Unknown prompt target/)
  })

  it('is found by id', () => {
    expect(getPromptTarget('gemini')?.label).toBe('Gemini')
    expect(getPromptTarget('nope')).toBeUndefined()
  })
})

describe('presets', () => {
  it('groups the six formats into the three families', () => {
    expect(presetsInFamily('prompt').map((preset) => preset.id)).toEqual([
      'prompt-claude-code',
      'prompt-chatgpt',
      'prompt-gemini',
    ])
    expect(presetsInFamily('doc').map((preset) => preset.id)).toEqual(['markdown'])
    expect(presetsInFamily('kit').map((preset) => preset.id)).toEqual(['generic', 'claude-code'])
    // Every preset belongs to exactly one family, so none can hide from the UI.
    expect(
      presetsInFamily('prompt').length + presetsInFamily('doc').length + presetsInFamily('kit').length
    ).toBe(PRESETS.length)
  })

  it('builds a prompt preset as the single file someone pastes', () => {
    const files = buildFileTree(starter(), 'prompt-gemini')
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('prompt-gemini.md')
    expect(files[0].content).toContain('<agente>')
  })
})
