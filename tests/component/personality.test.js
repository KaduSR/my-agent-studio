// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { personalityStep } from '../../js/steps/personality.js'
import { loadAgent, getAgent } from '../../js/stores/builder-store.js'
import { createEmptyAgent, DEFAULT_SLIDERS } from '../../js/agent/defaults.js'
import { BEHAVIOR_PRESETS, BEHAVIOR_SLIDERS } from '../../js/data/behavior-sliders.js'

/** @type {{ element: HTMLElement, destroy?: () => void }} */
let view

beforeEach(() => {
  loadAgent(createEmptyAgent())
  view = personalityStep()
  document.body.appendChild(view.element)
})

const toneGrid = () => /** @type {HTMLElement} */ (document.querySelector('.card-grid'))
const traitRow = () => /** @type {HTMLElement} */ (document.querySelector('.chip-row'))

describe('tone selection (SPEC 23)', () => {
  it('exposes tones as checkboxes, not a dropdown (SPEC 74)', () => {
    expect(document.querySelector('select')).toBeNull()
    expect(within(toneGrid()).getAllByRole('checkbox')).toHaveLength(12)
  })

  it('selects and deselects a tone', async () => {
    const user = userEvent.setup()
    const friendly = within(toneGrid()).getByRole('checkbox', { name: /Amigável/ })

    await user.click(friendly)
    expect(getAgent().personality.tones).toEqual(['friendly'])
    expect(within(toneGrid()).getByRole('checkbox', { name: /Amigável/ })).toHaveProperty(
      'ariaChecked',
      'true'
    )

    await user.click(within(toneGrid()).getByRole('checkbox', { name: /Amigável/ }))
    expect(getAgent().personality.tones).toEqual([])
  })

  it('is operable with the keyboard alone', async () => {
    const user = userEvent.setup()
    within(toneGrid()).getByRole('checkbox', { name: /Amigável/ }).focus()
    await user.keyboard(' ')
    expect(getAgent().personality.tones).toEqual(['friendly'])
  })

  it('refuses a fourth tone and explains why', async () => {
    const user = userEvent.setup()
    for (const name of [/Amigável/, /Didático/, /Calmo/]) {
      await user.click(within(toneGrid()).getByRole('checkbox', { name }))
    }
    await user.click(within(toneGrid()).getByRole('checkbox', { name: /Criativo/ }))

    expect(getAgent().personality.tones).toHaveLength(3)
    expect(await screen.findByText(/no máximo 3 tons/)).toBeTruthy()
  })

  it('keeps blocked cards operable rather than marking them disabled', async () => {
    const user = userEvent.setup()
    for (const name of [/Amigável/, /Didático/, /Calmo/]) {
      await user.click(within(toneGrid()).getByRole('checkbox', { name }))
    }

    const blocked = within(toneGrid()).getByRole('checkbox', { name: /Criativo/ })
    expect(blocked.getAttribute('aria-disabled')).toBeNull()
    expect(blocked.dataset.blocked).toBe('true')
    expect(blocked.getAttribute('title')).toMatch(/já escolheu 3 tons/)
  })

  it('updates the counter badge', async () => {
    const user = userEvent.setup()
    expect(screen.getByText('0/3')).toBeTruthy()
    await user.click(within(toneGrid()).getByRole('checkbox', { name: /Amigável/ }))
    expect(screen.getByText('1/3')).toBeTruthy()
  })
})

describe('response style (SPEC 24)', () => {
  // Selecting rebuilds the group, so it must be re-queried after every click.
  const group = () => /** @type {HTMLElement} */ (document.querySelector('[role="radiogroup"]'))

  it('is a single-choice radiogroup', async () => {
    const user = userEvent.setup()
    expect(group()).toBeTruthy()

    await user.click(within(group()).getByRole('radio', { name: /Claro e direto/ }))
    expect(getAgent().personality.responseStyle).toBe('clear-direct')

    await user.click(within(group()).getByRole('radio', { name: /Socrático/ }))
    expect(getAgent().personality.responseStyle).toBe('socratic')

    // Choosing another option replaces the first: exactly one stays checked.
    const checked = within(group())
      .getAllByRole('radio')
      .filter((radio) => radio.getAttribute('aria-checked') === 'true')
    expect(checked).toHaveLength(1)
    expect(checked[0].textContent).toContain('Socrático')
  })

  it('walks the whole group with the arrow keys without losing focus', async () => {
    const user = userEvent.setup()
    within(group()).getByRole('radio', { name: /Claro e direto/ }).focus()

    // A second arrow only works if focus survived the re-render the first
    // selection triggered — the regression this guards against.
    await user.keyboard('{ArrowDown}')
    expect(getAgent().personality.responseStyle).toBe('detailed')

    await user.keyboard('{ArrowDown}')
    expect(getAgent().personality.responseStyle).toBe('summarized')

    await user.keyboard('{ArrowUp}')
    expect(getAgent().personality.responseStyle).toBe('detailed')
  })
})

describe('focus survives re-render (SPEC 65)', () => {
  it('keeps focus on a tone card after toggling it', async () => {
    const user = userEvent.setup()
    within(toneGrid()).getByRole('checkbox', { name: /Amigável/ }).focus()
    await user.keyboard(' ')

    const active = /** @type {HTMLElement} */ (document.activeElement)
    expect(active.dataset.focusKey).toBe('tone-friendly')

    // And a second keystroke still lands on the same card.
    await user.keyboard(' ')
    expect(getAgent().personality.tones).toEqual([])
  })

  it('keeps focus on a trait chip after toggling it', async () => {
    const user = userEvent.setup()
    within(traitRow()).getByRole('checkbox', { name: 'Curioso' }).focus()
    await user.keyboard(' ')

    const active = /** @type {HTMLElement} */ (document.activeElement)
    expect(active.dataset.focusKey).toBe('trait-curious')
  })
})

describe('traits (SPEC 25)', () => {
  it('caps the selection at six', async () => {
    const user = userEvent.setup()
    const names = ['Empático', 'Paciente', 'Curioso', 'Analítico', 'Prático', 'Didático']
    for (const name of names) {
      await user.click(within(traitRow()).getByRole('checkbox', { name }))
    }
    expect(getAgent().personality.traits).toHaveLength(6)

    await user.click(within(traitRow()).getByRole('checkbox', { name: 'Preciso' }))
    expect(getAgent().personality.traits).toHaveLength(6)
  })
})

describe('behaviour sliders (SPEC 26)', () => {
  it('uses native range inputs with a human aria-valuetext', async () => {
    const sliders = document.querySelectorAll('input[type="range"]')
    expect(sliders).toHaveLength(BEHAVIOR_SLIDERS.length)

    const creativity = /** @type {HTMLInputElement} */ (document.querySelector('#slider-creativity'))
    expect(creativity.getAttribute('aria-valuetext')).toBe('Equilibrado')

    creativity.value = '95'
    creativity.dispatchEvent(new Event('input', { bubbles: true }))

    expect(getAgent().personality.creativity).toBe(95)
    expect(creativity.getAttribute('aria-valuetext')).toBe('Muito experimental')
  })

  it('never announces a band nobody would say out loud', () => {
    // The old formula prefixed "Muito" to the low label, which produced
    // "Muito só responde". Every band is now written out.
    const autonomy = /** @type {HTMLInputElement} */ (document.querySelector('#slider-autonomy'))
    autonomy.value = '5'
    autonomy.dispatchEvent(new Event('input', { bubbles: true }))
    expect(autonomy.getAttribute('aria-valuetext')).toBe('Confirma cada passo')
  })

  it('applies a preset to every slider at once, in the store and on screen', async () => {
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Rigoroso/ }))

    const rigorous = /** @type {import('../../js/data/behavior-sliders.js').BehaviorPreset} */ (
      BEHAVIOR_PRESETS.find((preset) => preset.id === 'rigorous')
    )

    for (const slider of BEHAVIOR_SLIDERS) {
      expect(getAgent().personality[slider.id], slider.id).toBe(rigorous.values[slider.id])
      // The controls own their DOM value, so the preset has to push it in.
      const input = /** @type {HTMLInputElement} */ (
        document.querySelector(`#slider-${slider.id}`)
      )
      expect(input.value, slider.id).toBe(String(rigorous.values[slider.id]))
    }
  })

  it('reads the nine sliders back as one sentence', async () => {
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Executivo/ }))

    const summary = document.querySelector('.behavior-summary')
    expect(summary?.textContent).toContain('enxuto')

    await user.click(screen.getByRole('button', { name: 'Voltar ao padrão' }))
    expect(getAgent().personality).toMatchObject(DEFAULT_SLIDERS)
    expect(document.querySelector('.behavior-summary')?.textContent).toContain('Equilibrado em tudo')
  })
})
