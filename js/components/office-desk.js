// @ts-check
/**
 * One desk in the office.
 *
 * The order lives on the desk itself rather than in a panel to the side, but it
 * starts folded: eight open textareas turn a room into a form, and what you need
 * to see at a glance is who is here and what they were told, not a field waiting
 * for a caret. Folded, the desk shows the text as a line; open, it is the field.
 *
 * The field is uncontrolled, like every other text input in the app, and the
 * office only rebuilds when the roster or the mode changes, so the caret is never
 * yanked out from under the typing.
 */

import { h, on } from '../lib/dom.js'
import { icon } from '../icons.js'
import { textField } from '../ui/field.js'
import { emptySprite, officeSprite } from '../ui/office-sprite.js'
import { getTeamMode } from '../data/team-modes.js'
import { LIMITS } from '../agent/validate.js'
import { navigate } from '../router.js'

/**
 * @param {Object} config
 * @param {import('../team/types.js').TeamMember} config.member
 * @param {import('../agent/types.js').Agent | undefined} config.agent
 * @param {import('../team/types.js').TeamMode} config.mode
 * @param {boolean} config.isLead
 * @param {boolean} [config.head] Rendered at the head of the table.
 * @param {number} config.index Desk position; staggers the hop.
 * @param {number} config.hue Colour for this seat, de-collided across the roster.
 * @param {number} [config.step] 1-based running order, under a sequential mode.
 * @param {boolean} [config.canMoveUp]
 * @param {boolean} [config.canMoveDown]
 * @param {(instruction: string) => void} config.onInstruction
 * @param {() => void} config.onPromote
 * @param {(delta: number) => void} config.onMove
 * @param {() => void} config.onRemove
 * @returns {HTMLElement}
 */
export function officeDesk({
  member,
  agent,
  mode,
  isLead,
  head = false,
  index,
  hue,
  step,
  canMoveUp = false,
  canMoveDown = false,
  onInstruction,
  onPromote,
  onMove,
  onRemove,
}) {
  const definition = getTeamMode(mode)
  const name = agent ? agent.name.trim() || 'Agente sem nome' : 'Mesa vazia'
  const size = head ? 62 : 48

  // One field, several readings. The text survives every mode change, because
  // losing what someone wrote to flip a radio button would be rude.
  const label =
    isLead && definition.leadInstructionLabel
      ? definition.leadInstructionLabel
      : definition.instructionLabel
  const placeholder =
    isLead && definition.leadInstructionPlaceholder
      ? definition.leadInstructionPlaceholder
      : definition.instructionPlaceholder

  const written = member.instruction.trim()

  const instruction = agent
    ? textField({
        label,
        value: member.instruction,
        placeholder,
        maxLength: LIMITS.teamInstructionMax,
        multiline: true,
        rows: 3,
        validateAs: 'teamInstruction',
        onInput: onInstruction,
      })
    : null

  /*
   * A native <details> rather than a hand-rolled disclosure: the open/close
   * state, the keyboard behaviour and the announcement all come from the
   * platform, and Ctrl+F in the browser can still find the text inside.
   */
  const fold = instruction
    ? h(
        'details',
        { class: 'desk__fold' },
        h(
          'summary',
          { class: 'desk__fold-summary' },
          h('span', { class: 'desk__fold-label' }, label),
          h(
            'span',
            { class: written ? 'desk__fold-preview' : 'desk__fold-preview desk__fold-preview--empty' },
            written || 'Nada escrito ainda'
          )
        ),
        instruction.element
      )
    : null

  // Opening the fold should put the caret in the field: the click said "I want
  // to write this", and making them click a second time is a small insult.
  if (fold && instruction) {
    on(fold, 'toggle', () => {
      if (/** @type {HTMLDetailsElement} */ (fold).open) {
        instruction.input.focus({ preventScroll: true })
      }
    })
  }

  return h(
    'li',
    {
      class: head ? 'desk desk--head' : 'desk',
      dataset: {
        ...(agent ? {} : { missing: 'true' }),
        ...(isLead ? { lead: 'true' } : {}),
        focusKey: member.agentId,
      },
    },
    h(
      'div',
      { class: 'desk__figure' },
      step !== undefined
        ? h('span', { class: 'desk__step', 'aria-hidden': 'true' }, String(step))
        : null,
      agent
        ? officeSprite({ agentId: member.agentId, avatarId: agent.avatarId, hue, index, size })
        : emptySprite(),
      h('span', { class: 'desk__slab' })
    ),
    h(
      'div',
      { class: 'desk__plate' },
      h('span', { class: 'desk__name' }, name),
      isLead && agent
        ? h(
            'span',
            { class: 'desk__badge' },
            icon(definition.lead === 'reviewer' ? 'rotate-ccw' : 'shield-check', { size: 12 }),
            definition.leadLabel ?? 'Líder'
          )
        : null
    ),
    h(
      'p',
      { class: 'desk__objective helper' },
      agent
        ? agent.objective.trim() || agent.description?.trim() || 'Sem objetivo definido.'
        : 'Este agente foi excluído deste navegador.'
    ),
    fold,
    h(
      'div',
      { class: 'desk__actions' },
      definition.lead && agent && !isLead
        ? h(
            'button',
            { type: 'button', class: 'btn btn-secondary btn-sm', onclick: onPromote },
            icon(definition.lead === 'reviewer' ? 'rotate-ccw' : 'shield-check', { size: 14 }),
            definition.promoteLabel ?? 'Tornar líder'
          )
        : null,
      // Order matters under a sequential mode, so the desks have to be movable.
      definition.sequential
        ? h(
            'button',
            {
              type: 'button',
              class: 'btn btn-ghost btn-icon',
              'aria-label': `Mover para antes: ${name}`,
              title: 'Mover para antes',
              disabled: !canMoveUp,
              onclick: () => onMove(-1),
            },
            icon('chevron-left', { size: 15 })
          )
        : null,
      definition.sequential
        ? h(
            'button',
            {
              type: 'button',
              class: 'btn btn-ghost btn-icon',
              'aria-label': `Mover para depois: ${name}`,
              title: 'Mover para depois',
              disabled: !canMoveDown,
              onclick: () => onMove(1),
            },
            icon('chevron-right', { size: 15 })
          )
        : null,
      agent
        ? h(
            'button',
            {
              type: 'button',
              class: 'btn btn-ghost btn-icon',
              'aria-label': `Abrir agente: ${name}`,
              title: 'Abrir agente',
              onclick: () => navigate(`/studio/${member.agentId}`),
            },
            icon('pencil', { size: 15 })
          )
        : null,
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn-ghost btn-icon',
          'aria-label': agent ? `Tirar do time: ${name}` : 'Remover mesa vazia',
          title: agent ? 'Tirar do time' : 'Remover mesa vazia',
          onclick: onRemove,
        },
        icon('x', { size: 15 })
      )
    )
  )
}
