// @ts-check
/**
 * The bench: the recent agents, waiting to be seated.
 *
 * They sit on the page rather than behind a dialog because that is what was
 * asked for, and because it is one click instead of two. `listAgents()` is
 * already sorted most-recent-first, so "agentes recentes" needs no second
 * concept behind it.
 */

import { h } from '../lib/dom.js'
import { icon } from '../icons.js'
import { avatarArt } from '../ui/avatar-art.js'
import { listAgents } from '../stores/library-store.js'
import { relativeTime } from './agent-card.js'
import { TEAM_LIMITS } from '../team/defaults.js'
import { navigate } from '../router.js'

/**
 * @param {Object} config
 * @param {import('../team/types.js').Team} config.team
 * @param {(agentId: string) => void} config.onSeat
 * @returns {HTMLElement}
 */
export function agentBench({ team, onSeat }) {
  const seated = new Set(team.members.map((member) => member.agentId))
  const available = listAgents().filter((agent) => !seated.has(agent.id))
  const full = team.members.length >= TEAM_LIMITS.maxMembers

  const heading = h(
    'div',
    { class: 'bench__heading' },
    h('h2', { class: 'section-title' }, 'Agentes recentes'),
    h(
      'p',
      { class: 'helper' },
      full
        ? `O time está cheio (${TEAM_LIMITS.maxMembers} agentes).`
        : 'Clique para sentar em uma mesa.'
    )
  )

  if (listAgents().length === 0) {
    return h(
      'section',
      { class: 'bench' },
      heading,
      h(
        'div',
        { class: 'empty-state' },
        h('span', { class: 'empty-state__icon' }, icon('user-round', { size: 22 })),
        h('p', { class: 'empty-state__title' }, 'Você ainda não tem agentes salvos.'),
        h(
          'p',
          { class: 'empty-state__description helper' },
          'Um time é feito dos seus agentes, então comece criando um.'
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn-primary btn-sm',
            onclick: () => navigate('/studio/new'),
          },
          icon('plus', { size: 15 }),
          'Criar agente'
        )
      )
    )
  }

  if (available.length === 0) {
    return h(
      'section',
      { class: 'bench' },
      heading,
      h(
        'p',
        { class: 'bench__note helper' },
        'Todos os seus agentes já estão sentados neste time.'
      )
    )
  }

  return h(
    'section',
    { class: 'bench' },
    heading,
    h(
      'ul',
      { class: 'bench__list' },
      ...available.map((agent) => {
        const name = agent.name.trim() || 'Agente sem nome'
        return h(
          'li',
          null,
          h(
            'button',
            {
              type: 'button',
              class: 'bench__agent',
              /*
               * A full team keeps its buttons operable and says why, the same
               * choice the tone cards make at their ceiling. A disabled control
               * that never explains itself is the thing to avoid.
               */
              dataset: full ? { blocked: 'true' } : {},
              title: full ? `O time está cheio (${TEAM_LIMITS.maxMembers} agentes).` : null,
              'aria-label': `Sentar no time: ${name}`,
              onclick: () => onSeat(agent.id),
            },
            avatarArt(agent.avatarId, 32),
            h(
              'span',
              { class: 'bench__text' },
              h('span', { class: 'bench__name' }, name),
              h('span', { class: 'bench__meta helper' }, `Editado ${relativeTime(agent.updatedAt)}`)
            ),
            h('span', { class: 'bench__go', 'aria-hidden': 'true' }, icon('plus', { size: 14 }))
          )
        )
      })
    )
  )
}
