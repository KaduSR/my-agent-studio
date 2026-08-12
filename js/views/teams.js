// @ts-check
/** Saved teams. */

import { h, setChildren } from '../lib/dom.js'
import { icon } from '../icons.js'
import { createTeamFromTemplate, deleteTeam, listTeams, teamsStore } from '../stores/teams-store.js'
import { TEAM_TEMPLATES } from '../data/team-templates.js'
import { getAgent, libraryStore } from '../stores/library-store.js'
import { teamCard } from '../components/team-card.js'
import { confirmDialog } from '../ui/dialog.js'
import { showToast } from '../ui/toast.js'
import { canExportTeam, downloadTeamKit, getTeamExportBlockers } from '../team/export.js'
import { resolveSeats } from '../team/markdown.js'
import { navigate } from '../router.js'
import { logger } from '../lib/logger.js'

/** @returns {{ element: HTMLElement, destroy: () => void }} */
export function teamsView() {
  const grid = h('ul', { class: 'agent-grid' })

  /**
   * The example team, and the four agents it is made of.
   *
   * The agents are real and land in the library, which is worth saying out loud
   * rather than letting the person discover four new rows later.
   *
   * @param {import('../data/team-templates.js').TeamTemplate} template
   * @returns {void}
   */
  const startFromTemplate = (template) => {
    const team = createTeamFromTemplate(template.id)
    if (!team) {
      showToast({ message: 'Não foi possível montar o time de exemplo.', variant: 'error' })
      return
    }

    showToast({
      message: `${template.label} criado, com ${template.members.length} agentes novos na sua biblioteca.`,
      variant: 'success',
    })
    navigate(`/times/${team.id}`)
  }

  /**
   * @param {import('../data/team-templates.js').TeamTemplate} template
   * @returns {HTMLElement}
   */
  const templateCard = (template) =>
    h(
      'button',
      {
        type: 'button',
        class: 'choice-card',
        onclick: () => startFromTemplate(template),
      },
      h('span', { class: 'choice-card__icon' }, template.emoji),
      h(
        'span',
        { class: 'choice-card__text' },
        h('span', { class: 'choice-card__label' }, template.label),
        h('span', { class: 'choice-card__description' }, template.tagline)
      ),
      h('span', { class: 'choice-card__go', 'aria-hidden': 'true' }, icon('arrow-right', { size: 15 }))
    )

  /** @returns {HTMLElement} */
  const templateSection = () =>
    h(
      'section',
      { class: 'team-templates' },
      h('h2', { class: 'section-title' }, 'Ou comece com um time pronto'),
      h(
        'p',
        { class: 'helper' },
        'O time vem montado, com os agentes criados na sua biblioteca e a ordem de cada um já escrita. Tudo é editável depois.'
      ),
      h('div', { class: 'choice-list' }, ...TEAM_TEMPLATES.map(templateCard))
    )

  const render = () => {
    const teams = listTeams()

    if (teams.length === 0) {
      setChildren(
        grid,
        h(
          'li',
          { class: 'agent-grid__empty' },
          h(
            'div',
            { class: 'empty-state' },
            h('span', { class: 'empty-state__icon' }, icon('handshake', { size: 22 })),
            h('p', { class: 'empty-state__title' }, 'Você ainda não montou nenhum time.'),
            h(
              'p',
              { class: 'empty-state__description helper' },
              'Um time reúne os agentes que você já criou, dá um objetivo comum a eles e define quem faz o quê.'
            ),
            h(
              'button',
              {
                type: 'button',
                class: 'btn btn-primary btn-sm',
                onclick: () => navigate('/times/new'),
              },
              icon('plus', { size: 15 }),
              'Criar time'
            )
          ),
          // Offering the ready-made team here means an empty list is a starting
          // point rather than a dead end, the same way the empty library offers
          // the agent templates.
          templateSection()
        )
      )
      return
    }

    setChildren(
      grid,
      ...teams.map((team) =>
        teamCard({
          team,
          onExport: async () => {
            // The card exports without opening the team, so it has to answer for
            // an incomplete one here rather than hand over a broken kit.
            if (!canExportTeam(team)) {
              showToast({
                message: `Falta preencher: ${getTeamExportBlockers(team)[0]}`,
                variant: 'error',
              })
              return
            }
            try {
              await downloadTeamKit(team, resolveSeats(team, getAgent))
              showToast({ message: 'Kit do time exportado.', variant: 'success' })
            } catch (error) {
              logger.error('Team ZIP generation failed', error)
              showToast({
                message: 'Não foi possível gerar o arquivo. Tente novamente.',
                variant: 'error',
              })
            }
          },
          onDelete: async () => {
            const confirmed = await confirmDialog({
              title: `Excluir ${team.name.trim() || 'este time'}?`,
              description: 'Os agentes continuam salvos. Só o time deixa de existir.',
              confirmLabel: 'Excluir',
              cancelLabel: 'Cancelar',
              danger: true,
            })
            if (!confirmed) return
            deleteTeam(team.id)
            showToast({ message: 'Time excluído.', variant: 'success' })
          },
        })
      )
    )
  }

  render()
  const stopTeams = teamsStore.select((state) => state.teams, () => {
    render()
    renderExtra()
  })
  // The cards read agent names for the roster strip and the manager line, so a
  // rename or a deletion elsewhere has to reach them.
  const stopLibrary = libraryStore.select((state) => state.agents, render)

  // Rebuilt with the grid, so the ready-made team appears once the list has
  // teams in it too: otherwise it would be reachable only until the first one.
  const extra = h('div')
  const renderExtra = () => {
    setChildren(extra, listTeams().length > 0 ? templateSection() : null)
  }
  renderExtra()

  const element = h(
    'div',
    { class: 'teams' },
    h(
      'header',
      { class: 'library__header' },
      h(
        'div',
        null,
        h('h1', { class: 'page-title' }, 'Times de agentes'),
        h('p', { class: 'helper' }, 'Quem trabalha com quem, e quem coordena.')
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn-primary',
          onclick: () => navigate('/times/new'),
        },
        icon('plus', { size: 16 }),
        'Criar time'
      )
    ),
    grid,
    extra
  )

  return {
    element,
    destroy: () => {
      stopTeams()
      stopLibrary()
    },
  }
}
