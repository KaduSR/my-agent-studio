// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { rulesStep } from '../../js/steps/rules.js'
import { getAgent, loadAgent } from '../../js/stores/builder-store.js'
import { createEmptyAgent } from '../../js/agent/defaults.js'

/** @type {{ element: HTMLElement, destroy?: () => void }} */
let view

beforeEach(() => {
  loadAgent(createEmptyAgent())
  view = rulesStep()
  document.body.appendChild(view.element)
})

const ruleValues = () =>
  Array.from(document.querySelectorAll('.rule__input')).map(
    (input) => /** @type {HTMLInputElement} */ (input).value
  )

describe('editing (SPEC 27)', () => {
  it('starts from the SPEC 76 defaults', () => {
    expect(ruleValues()).toEqual([
      'Nunca invente informações.',
      'Se não souber algo, diga explicitamente.',
      'Priorize clareza e objetividade.',
      'Proteja informações privadas do usuário.',
    ])
  })

  it('adds a rule with the Enter key', async () => {
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Nova regra'), 'Cite as fontes.{Enter}')

    expect(ruleValues()).toHaveLength(5)
    expect(ruleValues()[4]).toBe('Cite as fontes.')
    // The field clears so the next rule can be typed straight away.
    expect(/** @type {HTMLInputElement} */ (screen.getByLabelText('Nova regra')).value).toBe('')
  })

  it('edits rule text without rebuilding the list', async () => {
    const user = userEvent.setup()
    const first = screen.getByRole('textbox', { name: 'Regra 1' })

    await user.clear(first)
    await user.type(first, 'Texto editado')

    // Same element throughout: the caret must never be yanked mid-typing.
    expect(screen.getByRole('textbox', { name: 'Regra 1' })).toBe(first)
    expect(getAgent().guardRails[0].text).toBe('Texto editado')
  })

  it('removes a rule and offers an undo (SPEC 58)', async () => {
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Remover regra 2' }))

    expect(ruleValues()).toHaveLength(3)
    expect(ruleValues()).not.toContain('Se não souber algo, diga explicitamente.')

    await user.click(await screen.findByRole('button', { name: 'Desfazer' }))
    expect(ruleValues()[1]).toBe('Se não souber algo, diga explicitamente.')
  })

  it('shows an empty state once every rule is gone (SPEC 59)', async () => {
    const user = userEvent.setup()
    for (let i = 0; i < 4; i += 1) {
      await user.click(screen.getByRole('button', { name: 'Remover regra 1' }))
    }
    expect(screen.getByText('Nenhuma regra definida.')).toBeTruthy()
  })

  it('adds a suggestion and stops offering it (SPEC 28)', async () => {
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Declarar incertezas/ }))

    expect(ruleValues()).toContain('Declarar incertezas')
    expect(screen.queryByRole('button', { name: /^Declarar incertezas$/ })).toBeNull()
  })
})

describe('keyboard reordering (SPEC 65, ADR-009)', () => {
  /** @param {number} index */
  const handle = (index) =>
    screen.getByRole('button', { name: new RegExp(`Reordenar regra ${index}`) })

  it('picks up, moves and drops a rule', async () => {
    const user = userEvent.setup()
    const before = ruleValues()

    handle(1).focus()
    await user.keyboard(' ')
    expect(handle(1).getAttribute('aria-pressed')).toBe('true')

    await user.keyboard('{ArrowDown}')
    expect(ruleValues()[0]).toBe(before[1])
    expect(ruleValues()[1]).toBe(before[0])

    await user.keyboard(' ')
    expect(document.querySelector('.rules')?.getAttribute('data-grabbing')).toBeNull()
  })

  it('keeps focus on the handle across the whole move', async () => {
    const user = userEvent.setup()
    handle(1).focus()
    await user.keyboard(' ')
    await user.keyboard('{ArrowDown}')

    const active = /** @type {HTMLElement} */ (document.activeElement)
    expect(active.className).toBe('rule__handle')
    expect(active.getAttribute('aria-label')).toMatch(/Reordenar regra 2/)

    // A second move only works because focus survived the first.
    await user.keyboard('{ArrowDown}')
    expect(ruleValues()[2]).toBe('Nunca invente informações.')
  })

  it('cancels with Escape and restores the original position', async () => {
    const user = userEvent.setup()
    const before = ruleValues()

    handle(1).focus()
    await user.keyboard(' ')
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{ArrowDown}')
    expect(ruleValues()).not.toEqual(before)

    await user.keyboard('{Escape}')
    expect(ruleValues()).toEqual(before)
  })

  it('will not move the first rule above the list', async () => {
    const user = userEvent.setup()
    const before = ruleValues()

    handle(1).focus()
    await user.keyboard(' ')
    await user.keyboard('{ArrowUp}')
    expect(ruleValues()).toEqual(before)
  })

  it('announces each move in the live region', async () => {
    const user = userEvent.setup()
    handle(1).focus()
    await user.keyboard(' ')

    const live = /** @type {HTMLElement} */ (document.getElementById('live-region'))
    expect(live.textContent).toMatch(/selecionada para mover/)
  })
})

describe('list structure', () => {
  it('renumbers labels after a reorder', async () => {
    const user = userEvent.setup()
    screen.getByRole('button', { name: /Reordenar regra 1/ }).focus()
    await user.keyboard(' ')
    await user.keyboard('{ArrowDown}')
    await user.keyboard(' ')

    const numbers = Array.from(document.querySelectorAll('.rule__number')).map(
      (node) => node.textContent
    )
    expect(numbers).toEqual(['1', '2', '3', '4'])
    expect(within(document.body).getByRole('textbox', { name: 'Regra 1' })).toBeTruthy()
  })
})
