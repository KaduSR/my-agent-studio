// @ts-check
/**
 * The agent portrait (SPEC 15).
 *
 * The emotional anchor of the product — SPEC 104 wants the user to feel they
 * are shaping an identity, not filling in a form — so it gets the neon ring,
 * the glow, and the agent's name and description right underneath.
 *
 * Read-only: the portrait is fixed, so there is no picker. See data/avatars.js.
 */

import { h, setChildren } from '../lib/dom.js'
import { avatarArt } from '../ui/avatar-art.js'
import { gradientRing } from '../ui/gradient-ring.js'
import { builderStore } from '../stores/builder-store.js'

/** @returns {{ element: HTMLElement, destroy: () => void }} */
export function agentPortrait() {
  const element = h('div', { class: 'portrait' })

  const render = () => {
    const agent = builderStore.getState().agent
    setChildren(
      element,
      gradientRing(avatarArt(agent.avatarId, 132), { size: 156, glow: true }),
      h(
        'div',
        { class: 'portrait__identity' },
        h('p', { class: 'portrait__name' }, agent.name.trim() || 'Seu agente'),
        h(
          'p',
          { class: 'portrait__description helper' },
          agent.description?.trim() || 'Adicione uma descrição curta para dar contexto.'
        )
      )
    )
  }

  render()

  const destroy = builderStore.select(
    (state) => ({ name: state.agent.name, description: state.agent.description }),
    render
  )

  return { element, destroy }
}
