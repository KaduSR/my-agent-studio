// @ts-check
/** Landing page (SPEC 92). */

import { h, setChildren } from '../lib/dom.js'
import { icon } from '../icons.js'
import { avatarArt } from '../ui/avatar-art.js'
import { gradientRing } from '../ui/gradient-ring.js'
import { DEFAULT_AVATAR_ID } from '../data/avatars.js'
import { deleteAgent, libraryStore, listAgents } from '../stores/library-store.js'
import { navigate } from '../router.js'
import { relativeTime } from '../components/agent-card.js'
import { templateGrid } from '../components/template-picker.js'
import { confirmDialog } from '../ui/dialog.js'
import { showToast } from '../ui/toast.js'
import { openKeynote } from '../ui/keynote.js'

const RECENT_LIMIT = 3

/** @returns {{ element: HTMLElement, destroy: () => void }} */
export function homeView() {
  const recentSection = h('section', { class: 'home__recent' })

  const renderRecent = () => {
    const recent = listAgents().slice(0, RECENT_LIMIT)

    if (recent.length === 0) {
      setChildren(recentSection)
      recentSection.hidden = true
      return
    }

    recentSection.hidden = false
    setChildren(
      recentSection,
      h('h2', { class: 'section-title' }, 'Agentes recentes'),
      h(
        'ul',
        { class: 'recent-list' },
        ...recent.map((agent) => {
          const name = agent.name || 'Agente sem nome'

          return h(
            'li',
            { class: 'recent-item' },
            h(
              'button',
              {
                type: 'button',
                class: 'recent-item__open',
                onclick: () => navigate(`/studio/${agent.id}`),
              },
              avatarArt(agent.avatarId, 40),
              h(
                'span',
                { class: 'recent-item__text' },
                h('span', { class: 'recent-item__name' }, name),
                h('span', { class: 'recent-item__meta helper' }, `Editado ${relativeTime(agent.updatedAt)}`)
              )
            ),
            h(
              'button',
              {
                type: 'button',
                class: 'recent-item__delete',
                'aria-label': `Excluir: ${name}`,
                title: 'Excluir',
                onclick: async () => {
                  const confirmed = await confirmDialog({
                    title: `Excluir ${name}?`,
                    description: 'Esta ação removerá o agente deste navegador.',
                    confirmLabel: 'Excluir',
                    cancelLabel: 'Cancelar',
                    danger: true,
                  })
                  if (!confirmed) return
                  deleteAgent(agent.id)
                  showToast({ message: 'Agente excluído.', variant: 'success' })
                },
              },
              icon('trash-2', { size: 15 })
            )
          )
        })
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'link-button home__see-all',
          onclick: () => navigate('/studio'),
        },
        'Ver todos os agentes'
      )
    )
  }

  const element = h(
    'div',
    { class: 'home' },
    h(
      'section',
      { class: 'hero' },
      h(
        'div',
        { class: 'hero__art', 'aria-hidden': 'true' },
        gradientRing(avatarArt(DEFAULT_AVATAR_ID, 268), {
          size: 320,
          thickness: 7,
          glow: true,
          spin: true,
        })
      ),
      h(
        'div',
        { class: 'hero__text' },
        h('h1', { class: 'hero__title' }, 'My Agent Studio'),
        h('p', { class: 'hero__subtitle' }, 'Crie agentes de IA como você cria personagens.'),
        h(
          'p',
          { class: 'hero__description' },
          'Escolha o propósito, ajuste a personalidade e as regras. O My Agent Studio transforma tudo isso em documentação pronta para usar na sua ferramenta.'
        ),
        h(
          'div',
          { class: 'hero__actions' },
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn-primary',
              onclick: () => navigate('/studio/new'),
            },
            icon('plus', { size: 16 }),
            'Criar novo agente'
          ),
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn-secondary',
              onclick: openKeynote,
            },
            icon('sparkles', { size: 16 }),
            'Como funciona?'
          ),
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn-ghost',
              onclick: () => navigate('/studio'),
            },
            icon('folder', { size: 16 }),
            'Meus agentes'
          )
        ),
        h(
          'p',
          { class: 'hero__privacy helper' },
          icon('lock', { size: 13 }),
          'Seus agentes permanecem neste navegador.'
        )
      )
    ),
    templateGrid({
      title: 'Comece com um modelo',
      description:
        'Cada modelo já vem com objetivo, personalidade, regras e ferramentas definidos. Tudo é editável depois.',
    }),
    recentSection
  )

  renderRecent()
  const destroy = libraryStore.select((state) => state.agents, renderRecent)

  return { element, destroy }
}
