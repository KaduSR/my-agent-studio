// @ts-check
/**
 * Step 7 — Conhecimento.
 *
 * Two halves, and the order matters: what the agent already carries comes first,
 * the catalogue of ready-made best practices second. Someone opening this step
 * for the first time sees an empty shelf next to a shelf full of things worth
 * putting on it.
 *
 * Catalogue entries are *copied* when added, so the cards are add buttons rather
 * than checkboxes: unchecking one could not undo an edit the user has since made
 * to their copy. That is why this file builds its own card instead of reusing
 * optionCard, whose checkbox semantics would promise a toggle that does not
 * exist. Removal happens in the list above, where the user's own copy lives.
 */

import { h, setChildren } from '../lib/dom.js'
import { icon } from '../icons.js'
import { LIMITS } from '../agent/validate.js'
import {
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_LIBRARY,
  knowledgeInCategory,
} from '../data/knowledge-library.js'
import {
  addKnowledgeDoc,
  addKnowledgeFromLibrary,
  builderStore,
  moveKnowledgeDoc,
  removeKnowledgeDoc,
  updateKnowledgeDoc,
} from '../stores/builder-store.js'
import { knowledgeDialog } from '../ui/knowledge-dialog.js'
import { showToast } from '../ui/toast.js'
import { emptyState, reactiveBlock, section, stepShell } from './step-shell.js'

/**
 * The first line that says something, for the card. Headings are skipped because
 * a document that opens with its own title would otherwise preview as that title
 * twice over.
 *
 * @param {string} content
 * @returns {string}
 */
function excerpt(content) {
  const line = content
    .split('\n')
    .map((entry) => entry.trim())
    .find((entry) => entry.length > 0 && !entry.startsWith('#'))
  if (!line) return ''
  const clean = line.replace(/^[-*>]\s*/, '').replace(/[*`]/g, '')
  return clean.length > 120 ? `${clean.slice(0, 119)}…` : clean
}

/** @returns {import('./step-shell.js').StepView} */
export function knowledgeStep() {
  const count = h('span')

  /**
   * Open the editor for an existing document.
   * @param {import('../agent/types.js').AgentKnowledge} doc
   * @returns {Promise<void>}
   */
  const editDoc = async (doc) => {
    const result = await knowledgeDialog(doc)
    if (!result) return
    updateKnowledgeDoc(doc.id, result)
    showToast({ message: `${result.title} atualizado.`, variant: 'success' })
  }

  /** Open the editor for a new document. @returns {Promise<void>} */
  const writeDoc = async () => {
    if (builderStore.getState().agent.knowledge.length >= LIMITS.maxKnowledgeDocs) {
      showToast({
        message: `Você já tem ${LIMITS.maxKnowledgeDocs} documentos. Remova um para escrever outro.`,
        variant: 'info',
      })
      return
    }
    const result = await knowledgeDialog()
    if (!result) return
    const id = addKnowledgeDoc(result)
    if (id) showToast({ message: `${result.title} adicionado.`, variant: 'success' })
  }

  /* -------------------------- the agent's own shelf --------------------- */

  /**
   * @param {import('../agent/types.js').AgentKnowledge} doc
   * @param {number} index
   * @param {number} total
   * @returns {HTMLElement}
   */
  const docCard = (doc, index, total) => {
    const summary = excerpt(doc.content)

    return h(
      'article',
      { class: 'knowledge-doc' },
      h(
        'div',
        { class: 'knowledge-doc__head' },
        h(
          'div',
          { class: 'knowledge-doc__text' },
          h(
            'h3',
            { class: 'knowledge-doc__title' },
            doc.title,
            doc.sourceId
              ? h(
                  'span',
                  {
                    class: 'knowledge-doc__badge',
                    title: 'Começou como uma boas práticas do catálogo.',
                  },
                  'biblioteca'
                )
              : null
          ),
          summary ? h('p', { class: 'knowledge-doc__excerpt helper' }, summary) : null
        ),
        h(
          'div',
          { class: 'knowledge-doc__actions' },
          /*
           * These two are genuinely disabled at the ends, which is not the same
           * thing as the blocked-but-operable cards below. A ceiling has a reason
           * worth explaining on click; "this is already the first one" has none,
           * and a button that does nothing would be the worse answer.
           */
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn-ghost btn-icon',
              'aria-label': `Mover ${doc.title} para cima`,
              title: 'Mover para cima',
              dataset: { focusKey: `knowledge-up-${doc.id}` },
              disabled: index === 0,
              onclick: () => moveKnowledgeDoc(index, index - 1),
            },
            icon('chevron-up', { size: 16 })
          ),
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn-ghost btn-icon',
              'aria-label': `Mover ${doc.title} para baixo`,
              title: 'Mover para baixo',
              dataset: { focusKey: `knowledge-down-${doc.id}` },
              disabled: index === total - 1,
              onclick: () => moveKnowledgeDoc(index, index + 1),
            },
            icon('chevron-down', { size: 16 })
          ),
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn-ghost btn-icon',
              'aria-label': `Editar ${doc.title}`,
              title: 'Editar',
              dataset: { focusKey: `knowledge-edit-${doc.id}` },
              onclick: () => void editDoc(doc),
            },
            icon('pencil', { size: 16 })
          ),
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn-ghost btn-icon',
              'aria-label': `Remover ${doc.title}`,
              title: 'Remover',
              dataset: { focusKey: `knowledge-remove-${doc.id}` },
              onclick: () => {
                removeKnowledgeDoc(doc.id)
                showToast({ message: `${doc.title} removido.`, variant: 'info' })
              },
            },
            icon('trash-2', { size: 16 })
          )
        )
      ),
      h(
        'p',
        { class: 'knowledge-doc__meta helper' },
        `${doc.content.length} de ${LIMITS.knowledgeContentMax} caracteres`
      )
    )
  }

  const addButton = () =>
    h(
      'button',
      {
        type: 'button',
        class: 'btn btn-secondary',
        dataset: { focusKey: 'knowledge-write' },
        onclick: () => void writeDoc(),
      },
      icon('plus', { size: 15 }),
      'Escrever documento'
    )

  const shelf = reactiveBlock(
    // Title and length are in the key because the card shows both. The content
    // itself is not: the editor is a dialog, so there is no caret out here to
    // lose, but rebuilding on every keystroke would still be wasted work.
    (state) =>
      state.agent.knowledge.map((doc) => `${doc.id}:${doc.title}:${doc.content.length}`).join('|'),
    (container) => {
      const docs = [...builderStore.getState().agent.knowledge].sort((a, b) => a.order - b.order)

      setChildren(
        count,
        h(
          'span',
          { class: 'count-badge', dataset: { full: String(docs.length >= LIMITS.maxKnowledgeDocs) } },
          `${docs.length}/${LIMITS.maxKnowledgeDocs}`
        )
      )

      if (docs.length === 0) {
        setChildren(
          container,
          emptyState({
            iconName: 'file-text',
            title: 'Nenhum documento ainda.',
            description:
              'Escreva o seu ou adicione uma das boas práticas prontas, logo abaixo.',
            actionLabel: 'Escrever documento',
            onAction: () => void writeDoc(),
          })
        )
        return
      }

      setChildren(
        container,
        h(
          'div',
          { class: 'knowledge-list' },
          ...docs.map((doc, index) => docCard(doc, index, docs.length))
        ),
        addButton()
      )
    }
  )

  /* ----------------------------- the catalogue -------------------------- */

  /**
   * @param {import('../data/knowledge-library.js').KnowledgeEntry} entry
   * @param {boolean} added
   * @param {boolean} full
   * @returns {HTMLElement}
   */
  const libraryCard = (entry, added, full) => {
    const blocked = added || full
    const hint = added
      ? 'Já está na sua base de conhecimento.'
      : `Você já tem ${LIMITS.maxKnowledgeDocs} documentos. Remova um para adicionar este.`

    return h(
      'button',
      {
        type: 'button',
        class: 'knowledge-card',
        // Blocked, never disabled: clicking explains why, which a disabled
        // button cannot do.
        dataset: {
          ...(added ? { added: 'true' } : {}),
          ...(blocked ? { blocked: 'true' } : {}),
          focusKey: `knowledge-entry-${entry.id}`,
        },
        title: blocked ? hint : 'Adicionar à base de conhecimento',
        onclick: () => {
          if (blocked) {
            showToast({ message: hint, variant: 'info' })
            return
          }
          if (addKnowledgeFromLibrary(entry.id)) {
            showToast({ message: `${entry.title} adicionado.`, variant: 'success' })
          }
        },
      },
      h(
        'span',
        { class: 'knowledge-card__icon' },
        icon(/** @type {any} */ (entry.icon), { size: 18 })
      ),
      h(
        'span',
        { class: 'knowledge-card__text' },
        h('span', { class: 'knowledge-card__label' }, entry.title),
        h('span', { class: 'knowledge-card__summary' }, entry.summary)
      ),
      h(
        'span',
        { class: 'knowledge-card__state', 'aria-hidden': 'true' },
        icon(added ? 'check' : 'plus', { size: 15 })
      )
    )
  }

  const library = reactiveBlock(
    (state) =>
      `${state.agent.knowledge.length}|${state.agent.knowledge
        .map((doc) => doc.sourceId ?? '')
        .join(',')}`,
    (container) => {
      const docs = builderStore.getState().agent.knowledge
      const added = new Set(docs.map((doc) => doc.sourceId).filter(Boolean))
      const full = docs.length >= LIMITS.maxKnowledgeDocs

      setChildren(
        container,
        ...KNOWLEDGE_CATEGORIES.map((category) => {
          const entries = knowledgeInCategory(category.id)
          return h(
            'div',
            { class: 'knowledge-group' },
            h('h3', { class: 'knowledge-group__title' }, category.label),
            h(
              'div',
              { class: 'knowledge-grid', role: 'group', 'aria-label': category.label },
              ...entries.map((entry) => libraryCard(entry, added.has(entry.id), full))
            )
          )
        })
      )
    }
  )

  const element = stepShell(
    'knowledge',
    section(
      {
        title: 'Base de conhecimento',
        emoji: '📚',
        description:
          'Os documentos que vão junto com o agente e valem para toda conversa. Eles saem na exportação, em Markdown.',
        aside: count,
      },
      shelf.element
    ),
    section(
      {
        title: 'Boas práticas prontas',
        emoji: '✨',
        description: `${KNOWLEDGE_LIBRARY.length} documentos que servem para quase qualquer agente. Ao adicionar, você recebe uma cópia editável.`,
      },
      library.element
    )
  )

  return {
    element,
    destroy: () => {
      shelf.destroy()
      library.destroy()
    },
  }
}
