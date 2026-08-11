// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { soulStep } from '../../js/steps/soul.js'
import { loadAgent, getAgent } from '../../js/stores/builder-store.js'
import { createEmptyAgent } from '../../js/agent/defaults.js'
import { SOUL_PRESETS, getSoulPreset } from '../../js/data/soul-presets.js'

/** @type {{ element: HTMLElement, destroy?: () => void }} */
let view

/**
 * Remounting replaces only the step, never the whole body: the toast region the
 * shared setup installs lives there too.
 * @param {import('../../js/agent/types.js').Agent} [agent]
 */
const mount = (agent = createEmptyAgent()) => {
  view?.element.remove()
  loadAgent(agent)
  view = soulStep()
  document.body.appendChild(view.element)
}

beforeEach(() => mount())

const presetRow = () => /** @type {HTMLElement} */ (document.querySelector('.behavior-presets'))
const valueRow = () => /** @type {HTMLElement} */ (document.querySelector('.chip-row'))
const textareas = () =>
  /** @type {HTMLTextAreaElement[]} */ (Array.from(document.querySelectorAll('textarea')))

describe('base souls', () => {
  it('offers one pill per preset, and no dropdown (SPEC 74)', () => {
    expect(document.querySelector('select')).toBeNull()
    expect(within(presetRow()).getAllByRole('button')).toHaveLength(SOUL_PRESETS.length)
  })

  it('stays reachable from the empty state, which is where it is most useful', () => {
    // A blank agent opens on the empty state, so the fields are not mounted yet.
    expect(textareas()).toHaveLength(0)
    expect(presetRow()).toBeTruthy()
  })

  it('fills the store and the three textareas from one click', async () => {
    const user = userEvent.setup()
    await user.click(within(presetRow()).getByRole('button', { name: /Tutor Socrático/ }))

    const preset = /** @type {import('../../js/data/soul-presets.js').SoulPreset} */ (
      getSoulPreset('socratic-tutor')
    )

    expect(getAgent().soul).toEqual(preset.soul)

    // The fields own their DOM value, so the preset has to push it in.
    const [mission, essence, philosophy] = textareas()
    expect(mission.value).toBe(preset.soul.mission)
    expect(essence.value).toBe(preset.soul.essence)
    expect(philosophy.value).toBe(preset.soul.philosophy)
  })

  it('marks the preset values as chips', async () => {
    const user = userEvent.setup()
    await user.click(within(presetRow()).getByRole('button', { name: /Guardião Cauteloso/ }))

    const checked = within(valueRow())
      .getAllByRole('checkbox')
      .filter((chip) => chip.getAttribute('aria-checked') === 'true')
      .map((chip) => chip.textContent)

    expect(checked).toEqual(['Precisão', 'Segurança', 'Transparência'])
  })

  it('replaces what was already typed rather than appending to it', async () => {
    const user = userEvent.setup()
    await user.click(within(presetRow()).getByRole('button', { name: /Analista Técnico/ }))

    const mission = textareas()[0]
    await user.clear(mission)
    await user.type(mission, 'Missão minha.')
    expect(getAgent().soul.mission).toBe('Missão minha.')

    await user.click(within(presetRow()).getByRole('button', { name: /Parceiro Criativo/ }))

    const preset = /** @type {import('../../js/data/soul-presets.js').SoulPreset} */ (
      getSoulPreset('creative-partner')
    )
    expect(getAgent().soul.mission).toBe(preset.soul.mission)
    expect(textareas()[0].value).toBe(preset.soul.mission)
  })

  it('leaves personality alone, because that is the next step to decide', async () => {
    const user = userEvent.setup()
    const before = getAgent().personality
    await user.click(within(presetRow()).getByRole('button', { name: /Consultor Executivo/ }))
    expect(getAgent().personality).toEqual(before)
  })

  it('confirms the change, since the fields are below the fold on a short screen', async () => {
    const user = userEvent.setup()
    await user.click(within(presetRow()).getByRole('button', { name: /Suporte Empático/ }))
    expect(await screen.findByText(/Soul Suporte Empático aplicada/)).toBeTruthy()
  })

  it('is operable with the keyboard alone', async () => {
    const user = userEvent.setup()
    within(presetRow()).getByRole('button', { name: /Tutor Socrático/ }).focus()
    await user.keyboard('{Enter}')
    expect(getAgent().soul.mission.length).toBeGreaterThan(0)
  })
})

describe('typing into the fields', () => {
  it('writes each field to the store on its own', async () => {
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Criar Soul' }))

    await user.type(textareas()[1], 'Honestidade sobre o que sabe.')
    expect(getAgent().soul.essence).toBe('Honestidade sobre o que sabe.')
    expect(getAgent().soul.mission).toBe('')
  })

  it('opens straight into the fields for an agent that already has a Soul', () => {
    mount(
      createEmptyAgent({
        soul: { mission: 'Já escrita.', essence: '', philosophy: '', values: [] },
      })
    )
    expect(textareas()).toHaveLength(3)
    expect(textareas()[0].value).toBe('Já escrita.')
  })
})

describe('focus survives re-render (SPEC 65)', () => {
  it('keeps focus on a value chip after toggling it', async () => {
    const user = userEvent.setup()
    within(valueRow()).getByRole('checkbox', { name: 'Empatia' }).focus()
    await user.keyboard(' ')

    const active = /** @type {HTMLElement} */ (document.activeElement)
    expect(active.dataset.focusKey).toBe('soulvalue-empathy')
    expect(getAgent().soul.values).toEqual(['empathy'])
  })
})
