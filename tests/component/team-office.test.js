// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { teamView } from '../../js/views/team.js'
import { createEmptyAgent } from '../../js/agent/defaults.js'
import { createEmptyTeam } from '../../js/team/defaults.js'
import { libraryStore } from '../../js/stores/library-store.js'
import { getTeam, saveTeam, teamsStore } from '../../js/stores/teams-store.js'

/** @type {{ element: HTMLElement, destroy: () => void }} */
let view

const ANA = createEmptyAgent({ id: 'a', name: 'Ana', objective: 'Checar cada dado.' })
const BRUNO = createEmptyAgent({ id: 'b', name: 'Bruno', objective: 'Escrever para leigos.' })

/**
 * @param {Partial<import('../../js/team/types.js').Team>} [overrides]
 * @returns {string} The team id.
 */
function mount(overrides = {}) {
  view?.destroy()
  view?.element.remove()

  libraryStore.setState({ agents: [ANA, BRUNO], loaded: true })
  teamsStore.setState({ teams: [], loaded: true })

  const team = createEmptyTeam({ name: 'Time de Conteúdo', ...overrides })
  saveTeam(team)

  view = teamView(team.id)
  document.body.appendChild(view.element)
  return team.id
}

const desks = () => Array.from(document.querySelectorAll('.desk'))
const deskFor = (/** @type {string} */ name) =>
  /** @type {HTMLElement} */ (desks().find((desk) => desk.textContent?.includes(name)))

/**
 * The summary that unfolds a desk's order field.
 *
 * Waits for the desk to exist first: seating an agent rebuilds the room, and a
 * slower machine can run the assertion before the rebuild lands.
 *
 * @param {string} name
 * @returns {Promise<HTMLElement>}
 */
const orderSummary = async (name) => {
  await waitFor(() => expect(deskFor(name)).toBeTruthy())
  return /** @type {HTMLElement} */ (deskFor(name).querySelector('summary'))
}

beforeEach(() => {
  mount()
})

describe('seating agents', () => {
  it('offers every saved agent on the bench and none of them on the floor', () => {
    expect(desks()).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Sentar no time: Ana' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sentar no time: Bruno' })).toBeTruthy()
  })

  it('moves an agent from the bench to a desk', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Sentar no time: Ana' }))

    expect(desks()).toHaveLength(1)
    expect(deskFor('Ana')).toBeTruthy()
    // Seated agents leave the bench, so the same agent cannot be added twice.
    expect(screen.queryByRole('button', { name: 'Sentar no time: Ana' })).toBeNull()
  })

  it('takes an agent back off the floor', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Sentar no time: Ana' }))
    await userEvent.click(screen.getByRole('button', { name: 'Tirar do time: Ana' }))

    expect(desks()).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Sentar no time: Ana' })).toBeTruthy()
  })

  it('hides the figure from assistive technology and puts the name in text', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Sentar no time: Ana' }))

    const sprite = /** @type {HTMLElement} */ (deskFor('Ana').querySelector('.sprite'))
    expect(sprite.getAttribute('aria-hidden')).toBe('true')
    expect(sprite.querySelector('button')).toBeNull()
    expect(within(deskFor('Ana')).getByText('Ana')).toBeTruthy()
  })
})

describe('the two modes', () => {
  it('starts on direct orders, with an order field on every desk', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Sentar no time: Ana' }))

    expect(within(deskFor('Ana')).getByLabelText(/Ordem para este agente/)).toBeTruthy()
    expect(document.querySelector('.office__head')).toBeNull()
    expect(document.querySelector('.office__spine')).toBeNull()
  })

  it('raises a head desk and relabels the field under a manager', async () => {
    const id = mount()
    await userEvent.click(screen.getByRole('button', { name: 'Sentar no time: Ana' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sentar no time: Bruno' }))

    await userEvent.click(screen.getByRole('radio', { name: /Time com gerente/ }))

    // The first desk takes the chair, so the mode is never half-applied.
    expect(getTeam(id)?.leadId).toBe('a')
    expect(document.querySelector('.office__head')).toBeTruthy()
    expect(document.querySelector('.office__spine')).toBeTruthy()
    expect(within(deskFor('Ana')).getByText('Gerente')).toBeTruthy()
    expect(within(deskFor('Bruno')).getByLabelText(/Especialidade no time/)).toBeTruthy()
    expect(within(deskFor('Bruno')).queryByLabelText(/Ordem para este agente/)).toBeNull()
  })

  it('moves the chair when another desk is promoted', async () => {
    const id = mount({ mode: 'managed' })
    await userEvent.click(screen.getByRole('button', { name: 'Sentar no time: Ana' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sentar no time: Bruno' }))

    await userEvent.click(within(deskFor('Bruno')).getByRole('button', { name: 'Tornar gerente' }))

    expect(getTeam(id)?.leadId).toBe('b')
    expect(within(deskFor('Bruno')).getByText('Gerente')).toBeTruthy()
    expect(within(deskFor('Ana')).queryByText('Gerente')).toBeNull()
  })

  it('asks for a manager once the one it had leaves the team', async () => {
    const id = mount({ mode: 'managed' })
    await userEvent.click(screen.getByRole('button', { name: 'Sentar no time: Ana' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sentar no time: Bruno' }))

    await userEvent.click(screen.getByRole('button', { name: 'Tirar do time: Ana' }))

    expect(getTeam(id)?.leadId).toBeNull()
    expect(screen.getByText(/Escolha quem é o gerente/)).toBeTruthy()
    // And the document refuses to be exported until somebody takes the chair.
    expect(screen.getByText('Escolha qual agente é o gerente.')).toBeTruthy()
  })

  it('keeps what was typed when the mode flips and flips back', async () => {
    const id = mount()
    await userEvent.click(screen.getByRole('button', { name: 'Sentar no time: Ana' }))

    /*
     * Open the fold before typing, the way a person does. It is also what makes
     * this deterministic: seating an agent moves focus to the new desk on the
     * next frame, and typing straight away raced that and lost the keystrokes to
     * a button on a slow machine.
     */
    await userEvent.click(await orderSummary('Ana'))
    await userEvent.type(
      within(deskFor('Ana')).getByLabelText(/Ordem para este agente/),
      'Levantar cinco estudos.'
    )

    await userEvent.click(screen.getByRole('radio', { name: /Time com gerente/ }))
    await userEvent.click(screen.getByRole('radio', { name: /Ordens diretas/ }))

    expect(getTeam(id)?.members[0].instruction).toBe('Levantar cinco estudos.')
    expect(
      /** @type {HTMLTextAreaElement} */ (
        within(deskFor('Ana')).getByLabelText(/Ordem para este agente/)
      ).value
    ).toBe('Levantar cinco estudos.')
  })
})

describe('an agent deleted from the library', () => {
  it('leaves an empty chair rather than dropping the seat', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Sentar no time: Ana' }))

    libraryStore.setState({ agents: [BRUNO] })

    expect(desks()).toHaveLength(1)
    const empty = /** @type {HTMLElement} */ (document.querySelector('.desk[data-missing="true"]'))
    expect(empty).toBeTruthy()
    expect(empty.textContent).toContain('Este agente foi excluído')
    expect(screen.getByRole('button', { name: 'Remover mesa vazia' })).toBeTruthy()
  })
})

describe('exporting', () => {
  it('says what is missing instead of only dimming the buttons', () => {
    expect(screen.getByText('Escreva o objetivo do time.')).toBeTruthy()
    expect(screen.getByText('Sente pelo menos um agente em uma mesa.')).toBeTruthy()
    expect(
      /** @type {HTMLButtonElement} */ (screen.getByRole('button', { name: /Copiar prompt/ })).disabled
    ).toBe(true)
  })

  it('opens up once the team is complete', async () => {
    mount({ objective: 'Publicar um artigo por semana.' })
    await userEvent.click(screen.getByRole('button', { name: 'Sentar no time: Ana' }))

    expect(
      /** @type {HTMLButtonElement} */ (screen.getByRole('button', { name: /Copiar prompt/ })).disabled
    ).toBe(false)
  })
})

describe('motion', () => {
  it('can be stopped and started, which WCAG 2.2.2 asks for', async () => {
    const office = /** @type {HTMLElement} */ (document.querySelector('.office'))

    /*
     * The starting state is whatever the system preference says, and the
     * matchMedia polyfill in tests/setup.js only evaluates width features, so it
     * answers "reduce motion" here. What matters is that the control flips the
     * room in both directions and keeps its label honest.
     */
    const first = office.dataset.motion === 'paused' ? 'Animar' : 'Pausar animação'
    const second = first === 'Animar' ? 'Pausar animação' : 'Animar'

    await userEvent.click(screen.getByRole('button', { name: first }))
    expect(office.dataset.motion).toBe(first === 'Animar' ? 'running' : 'paused')
    const toggle = screen.getByRole('button', { name: second })
    expect(toggle.getAttribute('aria-pressed')).toBe(String(first !== 'Animar'))

    await userEvent.click(toggle)
    expect(office.dataset.motion).toBe(first === 'Animar' ? 'paused' : 'running')
  })
})

describe('teardown', () => {
  it('stops listening once destroyed', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Sentar no time: Ana' }))
    view.destroy()

    libraryStore.setState({ agents: [] })

    // Still one desk, still Ana: nothing re-rendered the detached tree.
    expect(desks()).toHaveLength(1)
    expect(deskFor('Ana')).toBeTruthy()
  })
})
