// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { knowledgeStep } from '../../js/steps/knowledge.js'
import { loadAgent, getAgent } from '../../js/stores/builder-store.js'
import { createEmptyAgent, createKnowledgeDoc } from '../../js/agent/defaults.js'
import { KNOWLEDGE_LIBRARY, getKnowledgeEntry } from '../../js/data/knowledge-library.js'
import { LIMITS } from '../../js/agent/validate.js'

/** @type {{ element: HTMLElement, destroy?: () => void }} */
let view

/**
 * Remounting replaces only the step: the toast region the shared setup installs
 * lives in the body too.
 * @param {import('../../js/agent/types.js').Agent} [agent]
 */
const mount = (agent = createEmptyAgent()) => {
  view?.element.remove()
  loadAgent(agent)
  view = knowledgeStep()
  document.body.appendChild(view.element)
}

beforeEach(() => mount())

const shelf = () => /** @type {HTMLElement} */ (document.querySelector('.step-view__sections'))
const catalogue = () =>
  /** @type {HTMLElement[]} */ (Array.from(document.querySelectorAll('.knowledge-card')))
/** @param {string} title */
const cardFor = (title) =>
  /** @type {HTMLElement} */ (
    catalogue().find((card) => card.textContent?.includes(title))
  )
const dialog = () => /** @type {HTMLDialogElement} */ (document.querySelector('dialog.dialog'))

/**
 * @param {number} count
 * @returns {import('../../js/agent/types.js').Agent}
 */
const agentWithDocs = (count) =>
  createEmptyAgent({
    knowledge: Array.from({ length: count }, (_, index) =>
      createKnowledgeDoc(`Documento ${index + 1}`, `Conteúdo ${index + 1}.`, index)
    ),
  })

describe('the catalogue', () => {
  it('shows every entry, grouped, and no dropdown (SPEC 74)', () => {
    expect(document.querySelector('select')).toBeNull()
    expect(catalogue()).toHaveLength(KNOWLEDGE_LIBRARY.length)
    expect(document.querySelectorAll('.knowledge-group')).toHaveLength(4)
  })

  it('copies an entry into the agent, with its provenance', async () => {
    const user = userEvent.setup()
    await user.click(cardFor('Lidar com incerteza'))

    const entry = /** @type {import('../../js/data/knowledge-library.js').KnowledgeEntry} */ (
      getKnowledgeEntry('uncertainty')
    )
    const [doc] = getAgent().knowledge

    expect(doc.title).toBe(entry.title)
    expect(doc.content).toBe(entry.content.trim())
    expect(doc.sourceId).toBe('uncertainty')
    expect(doc.order).toBe(0)
    expect(await screen.findByText(/Lidar com incerteza adicionado/)).toBeTruthy()
  })

  it('marks what is already on the shelf and refuses to add it twice', async () => {
    const user = userEvent.setup()
    await user.click(cardFor('Escrita clara'))
    expect(cardFor('Escrita clara').dataset.added).toBe('true')

    await user.click(cardFor('Escrita clara'))
    expect(getAgent().knowledge).toHaveLength(1)
    expect(await screen.findByText(/Já está na sua base/)).toBeTruthy()
  })

  it('keeps an added card operable rather than marking it disabled', async () => {
    const user = userEvent.setup()
    await user.click(cardFor('Escrita clara'))

    const card = cardFor('Escrita clara')
    expect(card.getAttribute('disabled')).toBeNull()
    expect(card.getAttribute('aria-disabled')).toBeNull()
    expect(card.getAttribute('title')).toMatch(/Já está na sua base/)
  })

  it('explains the ceiling instead of silently swallowing the click', async () => {
    const user = userEvent.setup()
    mount(agentWithDocs(LIMITS.maxKnowledgeDocs))

    const card = cardFor('Escrita clara')
    expect(card.dataset.blocked).toBe('true')
    expect(card.getAttribute('disabled')).toBeNull()

    await user.click(card)
    expect(getAgent().knowledge).toHaveLength(LIMITS.maxKnowledgeDocs)
    expect(await screen.findByText(/Remova um para adicionar este/)).toBeTruthy()
  })

  it('is operable with the keyboard alone', async () => {
    const user = userEvent.setup()
    cardFor('Citar fonte e datar').focus()
    await user.keyboard('{Enter}')
    expect(getAgent().knowledge.map((doc) => doc.sourceId)).toEqual(['source-citation'])
  })
})

describe('the shelf', () => {
  it('starts empty and offers a way out of the empty state', () => {
    expect(within(shelf()).getByText(/Nenhum documento ainda/)).toBeTruthy()
    expect(screen.getByText('0/12')).toBeTruthy()
  })

  it('counts what is on it', async () => {
    const user = userEvent.setup()
    await user.click(cardFor('Escrita clara'))
    expect(screen.getByText('1/12')).toBeTruthy()
  })

  it('lists a document with its size and its provenance badge', async () => {
    const user = userEvent.setup()
    await user.click(cardFor('Escrita clara'))

    const card = /** @type {HTMLElement} */ (document.querySelector('.knowledge-doc'))
    expect(within(card).getByText('biblioteca')).toBeTruthy()
    expect(card.textContent).toMatch(/de 4000 caracteres/)
  })

  it('removes a document and renumbers what is left', async () => {
    const user = userEvent.setup()
    mount(agentWithDocs(3))

    await user.click(screen.getByRole('button', { name: 'Remover Documento 2' }))

    expect(getAgent().knowledge.map((doc) => doc.title)).toEqual(['Documento 1', 'Documento 3'])
    expect(getAgent().knowledge.map((doc) => doc.order)).toEqual([0, 1])
    expect(await screen.findByText(/Documento 2 removido/)).toBeTruthy()
  })

  it('reorders with the arrows, and cannot move past either end', async () => {
    const user = userEvent.setup()
    mount(agentWithDocs(3))

    await user.click(screen.getByRole('button', { name: 'Mover Documento 3 para cima' }))
    expect(getAgent().knowledge.map((doc) => doc.title)).toEqual([
      'Documento 1',
      'Documento 3',
      'Documento 2',
    ])

    expect(screen.getByRole('button', { name: 'Mover Documento 1 para cima' })).toHaveProperty(
      'disabled',
      true
    )
    expect(screen.getByRole('button', { name: 'Mover Documento 2 para baixo' })).toHaveProperty(
      'disabled',
      true
    )
  })
})

describe('the editor', () => {
  it('writes a document from scratch, with a live preview of the source', async () => {
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Escrever documento/ }))

    await user.type(screen.getByLabelText('Título'), 'Nota do time')
    await user.type(screen.getByLabelText('Conteúdo'), '# Nota\n\n- Um ponto.')

    // The preview repaints on a frame, so it lands one tick after the keystroke.
    await waitFor(() =>
      expect(document.querySelector('.knowledge-editor__preview')?.textContent).toContain(
        'Um ponto.'
      )
    )

    await user.click(screen.getByRole('button', { name: /Adicionar/ }))

    const [doc] = getAgent().knowledge
    expect(doc.title).toBe('Nota do time')
    expect(doc.content).toBe('# Nota\n\n- Um ponto.')
    expect(doc.sourceId).toBeUndefined()
  })

  it('refuses to save without a title or without content', async () => {
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Escrever documento/ }))

    await user.click(screen.getByRole('button', { name: /Adicionar/ }))
    expect(screen.getByText('Dê um título ao documento.')).toBeTruthy()
    expect(getAgent().knowledge).toHaveLength(0)

    await user.type(screen.getByLabelText('Título'), 'Só o título')
    await user.click(screen.getByRole('button', { name: /Adicionar/ }))
    expect(screen.getByText('Escreva o conteúdo do documento.')).toBeTruthy()
    expect(getAgent().knowledge).toHaveLength(0)
  })

  it('leaves the shelf untouched when cancelled', async () => {
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Escrever documento/ }))
    await user.type(screen.getByLabelText('Título'), 'Descartada')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(getAgent().knowledge).toHaveLength(0)
    expect(dialog()).toBeNull()
  })

  it('edits a catalogue copy without losing where it came from', async () => {
    const user = userEvent.setup()
    await user.click(cardFor('Escrita clara'))
    await user.click(screen.getByRole('button', { name: 'Editar Escrita clara' }))

    const title = /** @type {HTMLInputElement} */ (screen.getByLabelText('Título'))
    await user.clear(title)
    await user.type(title, 'Escrita clara do time')
    await user.click(screen.getByRole('button', { name: /Salvar/ }))

    const [doc] = getAgent().knowledge
    expect(doc.title).toBe('Escrita clara do time')
    // Still the same entry, so the catalogue must not offer it again.
    expect(doc.sourceId).toBe('clear-writing')
    expect(cardFor('Escrita clara').dataset.added).toBe('true')
  })

  it('does not open at all once the shelf is full', async () => {
    const user = userEvent.setup()
    mount(agentWithDocs(LIMITS.maxKnowledgeDocs))

    await user.click(screen.getByRole('button', { name: /Escrever documento/ }))

    expect(dialog()).toBeNull()
    expect(await screen.findByText(/Remova um para escrever outro/)).toBeTruthy()
  })
})

describe('focus survives re-render (SPEC 65)', () => {
  it('keeps focus on a catalogue card after adding it', async () => {
    const user = userEvent.setup()
    cardFor('Escrita clara').focus()
    await user.keyboard('{Enter}')

    const active = /** @type {HTMLElement} */ (document.activeElement)
    expect(active.dataset.focusKey).toBe('knowledge-entry-clear-writing')
  })
})
