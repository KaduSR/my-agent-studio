import { describe, expect, it } from 'vitest'
import { PUPPET_STAGES } from '../../js/ui/puppet.js'
import { GLOSSARY } from '../../js/data/glossary.js'
import { KEYNOTE } from '../../js/data/keynote.js'
import { STEPS, getStep } from '../../js/data/steps.js'

/**
 * Both narratives name their figure by string. A typo would not throw: the
 * puppet would just come out as the default block of wood and nobody would
 * notice until a screenshot. These tests are what turn that into a failure.
 */
describe('every figure named in content exists', () => {
  it.each(GLOSSARY.map((entry) => [entry.term, entry.stage]))('glossary: %s', (_term, stage) => {
    expect(PUPPET_STAGES).toContain(stage)
  })

  it.each(KEYNOTE.map((slide) => [slide.id, slide.stage]))('keynote: %s', (_id, stage) => {
    expect(PUPPET_STAGES).toContain(stage)
  })
})

describe('glossary', () => {
  it('covers the words a beginner trips on first', () => {
    const ids = GLOSSARY.map((entry) => entry.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'llm',
        'token',
        'prompt',
        'context',
        'harness',
        'tools',
        'knowledge',
        'agent',
        'agent-vs-automation',
        'hallucination',
      ])
    )
  })

  it('has unique ids', () => {
    const ids = GLOSSARY.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(GLOSSARY.map((entry) => [entry.term, entry]))(
    '%s says it three ways: plain, story and example',
    (_term, entry) => {
      expect(entry.term.length).toBeGreaterThan(0)
      expect(entry.plain.length).toBeGreaterThan(40)
      expect(entry.story.length).toBeGreaterThan(40)
      expect(entry.example.length).toBeGreaterThan(40)
    }
  )

  it('keeps the em dash out of the explanations', () => {
    for (const entry of GLOSSARY) {
      expect(`${entry.plain} ${entry.story} ${entry.example}`).not.toContain('—')
    }
  })
})

describe('keynote', () => {
  it('keeps the em dash out of the narration', () => {
    for (const slide of KEYNOTE) {
      expect(`${slide.story} ${slide.lesson}`).not.toContain('—')
    }
  })

  it('explains every builder step exactly once', () => {
    const explained = KEYNOTE.map((slide) => slide.step).filter(Boolean)
    expect(explained).toEqual(STEPS.map((step) => step.id))
  })

  /**
   * The eyebrows are hand-written, so inserting a step renumbers eight of them.
   * This is what catches the one that gets forgotten.
   */
  it('numbers each step slide the way the sidebar does', () => {
    for (const slide of KEYNOTE) {
      if (!slide.step) continue
      expect(slide.eyebrow, slide.id).toBe(`Etapa ${getStep(slide.step).index}`)
    }
  })

  it('does not promise a step count the builder no longer has', () => {
    const spelled = ['sete', 'oito', 'nove', 'dez']
    const narration = KEYNOTE.map((slide) => `${slide.story} ${slide.lesson}`)
      .join(' ')
      .toLowerCase()

    for (const word of spelled) {
      const expected = spelled.indexOf(word) + 7 === STEPS.length
      expect(narration.includes(` ${word} etapas`), word).toBe(expected)
    }
  })
})
