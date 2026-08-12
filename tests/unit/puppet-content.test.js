import { describe, expect, it } from 'vitest'
import { PUPPET_STAGES } from '../../js/ui/puppet.js'
import { AGENTIC_STAGES } from '../../js/ui/puppet-scenes.js'
import { hasIcon } from '../../js/icons.js'
import { GLOSSARY } from '../../js/data/glossary.js'
import { KEYNOTE } from '../../js/data/keynote.js'
import { KEYNOTE_TRACKS } from '../../js/data/keynote-tracks.js'
import { STEPS, getStep } from '../../js/data/steps.js'

/**
 * Widened to strings: the agentic scenery declares its stages as plain keys, and
 * the point of comparing them is that nothing has typed them as stages yet.
 * @type {ReadonlyArray<string>}
 */
const STAGE_NAMES = PUPPET_STAGES

/** Every slide in the app, tagged with the track it belongs to. */
const ALL_SLIDES = KEYNOTE_TRACKS.flatMap((track) =>
  track.slides.map((slide) => ({ track: track.id, slide }))
)

/**
 * Collect every string a block carries, at any depth. Blocks nest (a table has
 * rows of cells, a compare has columns of items), and the copy rules below have
 * to reach all of it.
 *
 * @param {unknown} value
 * @returns {string[]}
 */
function stringsIn(value) {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(stringsIn)
  if (value && typeof value === 'object') return Object.values(value).flatMap(stringsIn)
  return []
}

/**
 * Both narratives name their figure by string. A typo would not throw: the
 * puppet would just come out as the default block of wood and nobody would
 * notice until a screenshot. These tests are what turn that into a failure.
 */
describe('every figure named in content exists', () => {
  it.each(GLOSSARY.map((entry) => [entry.term, entry.stage]))('glossary: %s', (_term, stage) => {
    expect(PUPPET_STAGES).toContain(stage)
  })

  it.each(ALL_SLIDES.map(({ track, slide }) => [`${track}/${slide.id}`, slide.stage]))(
    'keynote: %s',
    (_id, stage) => {
      expect(PUPPET_STAGES).toContain(stage)
    }
  )
})

/**
 * The agentic scenery is a separate module, so its stage names could drift away
 * from the union in ui/puppet.js without either file complaining. These two
 * assertions pin them together in both directions.
 */
describe('the agentic scenery', () => {
  it.each(AGENTIC_STAGES.map((stage) => [stage]))('%s is a declared stage', (stage) => {
    expect(STAGE_NAMES).toContain(stage)
  })

  it('is fully used by the track it was drawn for', () => {
    /** @type {Set<string>} */
    const drawn = new Set(
      KEYNOTE_TRACKS.flatMap((track) => track.slides.map((slide) => String(slide.stage)))
    )
    const unused = AGENTIC_STAGES.filter((stage) => !drawn.has(stage))
    expect(unused, 'scenes drawn but never shown').toEqual([])
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
    for (const { track, slide } of ALL_SLIDES) {
      expect(`${slide.story} ${slide.lesson} ${slide.term}`, `${track}/${slide.id}`).not.toContain(
        '—'
      )
    }
  })

  /**
   * The agentic track's copy also lives inside blocks, which the check above
   * cannot see. The source article this track summarises is written with em
   * dashes throughout, so this is the one that actually earns its keep.
   */
  it('keeps the em dash out of the blocks too', () => {
    for (const { track, slide } of ALL_SLIDES) {
      for (const text of stringsIn(slide.blocks ?? [])) {
        expect(text, `${track}/${slide.id}`).not.toContain('—')
      }
    }
  })

  /**
   * The tag is in the corner of every slide, so a missing one is a hole in the
   * chrome rather than a missing paragraph. The length cap is the pill: past
   * roughly twenty characters it wraps into the close button's row.
   */
  it('names the industry term for every slide, short enough to fit the tag', () => {
    for (const { track, slide } of ALL_SLIDES) {
      expect(slide.term, `${track}/${slide.id}`).toBeTruthy()
      expect(slide.term.length, `${track}/${slide.id}: ${slide.term}`).toBeLessThanOrEqual(20)
    }
  })

  it('gives every slide an id unique within its track', () => {
    for (const track of KEYNOTE_TRACKS) {
      const ids = track.slides.map((slide) => slide.id)
      expect(new Set(ids).size, track.id).toBe(ids.length)
    }
  })

  /**
   * icon() throws on an unknown name, and a block only renders when its slide is
   * reached, so a typo here would be a crash six slides in rather than a build
   * failure.
   */
  it('only names icons that exist', () => {
    for (const { track, slide } of ALL_SLIDES) {
      for (const block of slide.blocks ?? []) {
        /** @type {(string | undefined)[]} */
        let named = []
        if (block.type === 'points') named = block.items.map((item) => item.iconName)
        if (block.type === 'compare') named = block.columns.map((column) => column.iconName)

        for (const name of named.filter(Boolean)) {
          expect(hasIcon(String(name)), `${track}/${slide.id}: ${name}`).toBe(true)
        }
      }
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
