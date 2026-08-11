// @ts-check
/** Saved agents (SPEC 93, 95, 96). */

import { h, setChildren } from '../lib/dom.js'
import { icon } from '../icons.js'
import {
  deleteAgent,
  duplicateAgentById,
  libraryStore,
  listAgents,
} from '../stores/library-store.js'
import { agentCard } from '../components/agent-card.js'
import { templateGrid } from '../components/template-picker.js'
import { openNewAgentDialog } from '../ui/new-agent-dialog.js'
import { confirmDialog } from '../ui/dialog.js'
import { showToast } from '../ui/toast.js'
import { downloadAgentZip } from '../agent/export.js'
import { DEFAULT_PRESET } from '../agent/presets.js'
import { navigate } from '../router.js'
import { logger } from '../lib/logger.js'

/** @returns {{ element: HTMLElement, destroy: () => void }} */
export function libraryView() {
  const grid = h('ul', { class: 'agent-grid' })

  const render = () => {
    const agents = listAgents()

    if (agents.length === 0) {
      setChildren(
        grid,
        h(
          'li',
          { class: 'agent-grid__empty' },
          h(
            'div',
            { class: 'empty-state' },
            h('span', { class: 'empty-state__icon' }, icon('user-round', { size: 22 })),
            h('p', { class: 'empty-state__title' }, 'Você ainda não salvou nenhum agente.'),
            h(
              'p',
              { class: 'empty-state__description helper' },
              'Crie o primeiro e ele aparecerá aqui automaticamente.'
            ),
            h(
              'button',
              {
                type: 'button',
                class: 'btn btn-primary btn-sm',
                onclick: () => navigate('/studio/new'),
              },
              icon('plus', { size: 15 }),
              'Criar do zero'
            )
          ),
          // Offering the templates here too means an empty library is a starting
          // point rather than a dead end.
          templateGrid({ title: 'Ou comece com um modelo' })
        )
      )
      return
    }

    setChildren(
      grid,
      ...agents.map((agent) =>
        agentCard({
          agent,
          onDuplicate: () => {
            const copy = duplicateAgentById(agent.id)
            if (copy) showToast({ message: `"${copy.name}" criado.`, variant: 'success' })
          },
          onExport: async () => {
            try {
              await downloadAgentZip(agent, DEFAULT_PRESET)
              showToast({ message: 'Estrutura exportada.', variant: 'success' })
            } catch (error) {
              logger.error('ZIP generation failed', error)
              showToast({
                message: 'Não foi possível gerar o arquivo. Tente novamente.',
                variant: 'error',
              })
            }
          },
          onDelete: async () => {
            const confirmed = await confirmDialog({
              title: `Excluir ${agent.name || 'este agente'}?`,
              description: 'Esta ação removerá o agente deste navegador.',
              confirmLabel: 'Excluir',
              cancelLabel: 'Cancelar',
              danger: true,
            })
            if (!confirmed) return
            deleteAgent(agent.id)
            showToast({ message: 'Agente excluído.', variant: 'success' })
          },
        })
      )
    )
  }

  render()
  const unsubscribe = libraryStore.select((state) => state.agents, render)

  const element = h(
    'div',
    { class: 'library' },
    h(
      'header',
      { class: 'library__header' },
      h(
        'div',
        null,
        h('h1', { class: 'page-title' }, 'Meus agentes'),
        h('p', { class: 'helper' }, 'Tudo o que você criou neste navegador.')
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn-primary',
          onclick: openNewAgentDialog,
        },
        icon('plus', { size: 16 }),
        'Criar agente'
      )
    ),
    grid
  )

  return { element, destroy: unsubscribe }
}
