// @ts-check
/** Saved team card for the teams list. */

import { h } from '../lib/dom.js'
import { icon } from '../icons.js'
import { avatarArt } from '../ui/avatar-art.js'
import { hueMap } from '../ui/office-sprite.js'
import { navigate } from '../router.js'
import { relativeTime } from './agent-card.js'
import { getAgent } from '../stores/library-store.js'
import { activeLead } from '../team/defaults.js'
import { getTeamMode } from '../data/team-modes.js'

/** How many portraits the roster strip shows before collapsing into "+N". */
const STRIP_LIMIT = 4

/**
 * The one-line answer to "who is in here, and how do they work?".
 * @param {import('../team/types.js').Team} team
 * @returns {string}
 */
function modeSummary(team) {
  const count = team.members.length
  const people = `${count} ${count === 1 ? 'agente' : 'agentes'}`
  const mode = getTeamMode(team.mode)

  if (!mode.lead) return `${people} · ${mode.label}`

  const lead = activeLead(team)
  const leadName = lead ? getAgent(lead.agentId)?.name.trim() : ''
  const role = mode.leadLabel ?? 'Líder'
  return leadName ? `${people} · ${role}: ${leadName}` : `${people} · Sem ${role.toLowerCase()}`
}

/**
 * @param {Object} config
 * @param {import('../team/types.js').Team} config.team
 * @param {() => void} config.onExport
 * @param {() => void} config.onDelete
 * @returns {HTMLElement}
 */
export function teamCard({ team, onExport, onDelete }) {
  const name = team.name.trim() || 'Time sem nome'
  const summary = team.objective.trim() || 'Sem objetivo definido ainda.'
  const overflow = team.members.length - STRIP_LIMIT
  // The same assignment the office makes, so a face keeps its colour between
  // the card and the desk.
  const hues = hueMap(team.members.map((member) => member.agentId))

  /**
   * @param {string} label
   * @param {string} iconName
   * @param {() => void} onClick
   */
  const iconAction = (label, iconName, onClick) =>
    h(
      'button',
      {
        type: 'button',
        class: 'btn btn-ghost btn-icon',
        'aria-label': `${label}: ${name}`,
        title: label,
        onclick: onClick,
      },
      icon(/** @type {any} */ (iconName), { size: 16 })
    )

  return h(
    'li',
    { class: 'team-card' },
    h(
      'div',
      { class: 'team-card__head' },
      h(
        'div',
        { class: 'team-card__roster', 'aria-hidden': 'true' },
        // Static portraits, not sprites: the list is not the office, and four
        // figures hopping in every card would turn a quiet page into a
        // fairground. The hue still comes from the agent id, so a face keeps the
        // same colour here that it has at its desk.
        ...team.members
          .slice(0, STRIP_LIMIT)
          .map((member) =>
            h(
              'span',
              {
                class: 'team-card__seat',
                ref: (/** @type {HTMLElement} */ el) => {
                  el.style.setProperty('--sprite-hue', `${hues.get(member.agentId) ?? 0}deg`)
                },
              },
              avatarArt(getAgent(member.agentId)?.avatarId, 30)
            )
          ),
        overflow > 0 ? h('span', { class: 'team-card__more' }, `+${overflow}`) : null,
        team.members.length === 0
          ? h('span', { class: 'team-card__seat team-card__seat--empty' }, icon('user-round', { size: 15 }))
          : null
      ),
      h(
        'div',
        { class: 'team-card__identity' },
        h('h3', { class: 'team-card__name' }, name),
        h('p', { class: 'team-card__summary' }, summary)
      )
    ),
    h('p', { class: 'team-card__mode helper' }, modeSummary(team)),
    h(
      'div',
      { class: 'team-card__meta helper' },
      icon('clock', { size: 13 }),
      `Editado ${relativeTime(team.updatedAt)}`
    ),
    h(
      'div',
      { class: 'team-card__actions' },
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn-secondary btn-sm',
          onclick: () => navigate(`/times/${team.id}`),
        },
        icon('pencil', { size: 14 }),
        'Abrir'
      ),
      h(
        'div',
        { class: 'team-card__icons' },
        iconAction('Exportar', 'download', onExport),
        iconAction('Excluir', 'trash-2', onDelete)
      )
    )
  )
}
