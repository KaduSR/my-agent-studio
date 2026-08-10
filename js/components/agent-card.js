// @ts-check
/** Saved agent card for the library (SPEC 93, 95, 96). */

import { h } from '../lib/dom.js'
import { icon } from '../icons.js'
import { avatarArt } from '../ui/avatar-art.js'
import { gradientRing } from '../ui/gradient-ring.js'
import { navigate } from '../router.js'

/**
 * Relative time in plain Portuguese ("há 5 min").
 * @param {string} iso
 * @param {Date} [now]
 * @returns {string}
 */
export function relativeTime(iso, now = new Date()) {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''

  const seconds = Math.max(0, Math.round((now.getTime() - then) / 1000))
  if (seconds < 60) return 'agora mesmo'

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `há ${minutes} min`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `há ${hours} h`

  const days = Math.round(hours / 24)
  if (days < 30) return `há ${days} dia${days === 1 ? '' : 's'}`

  const months = Math.round(days / 30)
  if (months < 12) return `há ${months} ${months === 1 ? 'mês' : 'meses'}`

  const years = Math.round(months / 12)
  return `há ${years} ano${years === 1 ? '' : 's'}`
}

/**
 * @param {Object} config
 * @param {import('../agent/types.js').Agent} config.agent
 * @param {() => void} config.onDuplicate
 * @param {() => void} config.onDelete
 * @param {() => void} config.onExport
 * @returns {HTMLElement}
 */
export function agentCard({ agent, onDuplicate, onDelete, onExport }) {
  const name = agent.name.trim() || 'Agente sem nome'
  const summary = agent.description?.trim() || agent.objective.trim() || 'Sem objetivo definido ainda.'

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
    { class: 'agent-card' },
    h(
      'div',
      { class: 'agent-card__head' },
      gradientRing(avatarArt(agent.avatarId, 52), { size: 66, thickness: 3, glow: false }),
      h(
        'div',
        { class: 'agent-card__identity' },
        h('h3', { class: 'agent-card__name' }, name),
        h('p', { class: 'agent-card__summary' }, summary)
      )
    ),
    h(
      'div',
      { class: 'agent-card__meta helper' },
      icon('clock', { size: 13 }),
      `Editado ${relativeTime(agent.updatedAt)}`
    ),
    h(
      'div',
      { class: 'agent-card__actions' },
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn-secondary btn-sm',
          onclick: () => navigate(`/studio/${agent.id}`),
        },
        icon('pencil', { size: 14 }),
        'Editar'
      ),
      h(
        'div',
        { class: 'agent-card__icons' },
        iconAction('Exportar', 'download', onExport),
        iconAction('Duplicar', 'files', onDuplicate),
        iconAction('Excluir', 'trash-2', onDelete)
      )
    )
  )
}
