// @ts-check
/**
 * Application header (SPEC 14).
 *
 * The mark is an original gradient orb. SPEC 14 and SPEC 74 are explicit that
 * nothing here may borrow Instagram or Meta branding, so there is no logo, no
 * wordmark and no "by Meta" line anywhere in the product.
 *
 * SPEC 102.17 forbids controls that do nothing, which is why there is no signed
 * -out user menu: with no accounts in the MVP it would be pure decoration. The
 * slot carries the storage-privacy indicator from SPEC 68 instead, which is a
 * real statement about where the user's data lives.
 */

import { h, s, on } from '../lib/dom.js'
import { icon } from '../icons.js'
import { navigate } from '../router.js'
import { openCommandPalette } from '../ui/command-palette.js'
import { confirmDialog } from '../ui/dialog.js'
import { infoTooltip } from '../ui/tooltip.js'

/**
 * @typedef {Object} Crumb
 * @property {string} label
 * @property {string} [path]
 */

/** @returns {SVGSVGElement} The brand orb. */
function brandMark() {
  return s(
    'svg',
    { class: 'brand__mark', width: 26, height: 26, viewBox: '0 0 32 32', 'aria-hidden': 'true' },
    s(
      'defs',
      null,
      s(
        'linearGradient',
        { id: 'brand-orb', x1: '0', y1: '0', x2: '1', y2: '1' },
        s('stop', { offset: '0', 'stop-color': '#833AB4' }),
        s('stop', { offset: '0.5', 'stop-color': '#E1306C' }),
        s('stop', { offset: '1', 'stop-color': '#FCAF45' })
      )
    ),
    s('circle', { cx: '16', cy: '16', r: '13', fill: 'none', stroke: 'url(#brand-orb)', 'stroke-width': '5' })
  )
}

/** @returns {Promise<void>} */
async function openHelp() {
  await confirmDialog({
    title: 'Sobre o My Agent Studio',
    description:
      'Configure seu agente pelas oito etapas da lateral. Cada escolha atualiza o Markdown do painel direito na hora. Quando estiver pronto, use a etapa Exportar para copiar o texto ou baixar a estrutura completa de arquivos. Tudo acontece dentro deste navegador: nada é enviado para servidores.',
    confirmLabel: 'Entendi',
    cancelLabel: 'Fechar',
  })
}

/**
 * @param {Crumb[]} crumbs
 * @returns {HTMLElement}
 */
export function appHeader(crumbs) {
  const searchButton = h(
    'button',
    {
      type: 'button',
      class: 'header__search',
      onclick: () => openCommandPalette(),
    },
    icon('search', { size: 15 }),
    h('span', { class: 'header__search-label' }, 'Buscar no estúdio...'),
    h('kbd', { class: 'header__kbd' }, navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl K')
  )

  const nav = h(
    'nav',
    { class: 'breadcrumb', 'aria-label': 'Trilha de navegação' },
    ...crumbs.flatMap((crumb, index) => {
      const isLast = index === crumbs.length - 1
      /** @type {(HTMLElement | null)[]} */
      const parts = [
        index > 0
          ? h('span', { class: 'breadcrumb__sep', 'aria-hidden': 'true' }, icon('chevron-right', { size: 13 }))
          : null,
        crumb.path && !isLast
          ? h(
              'a',
              {
                class: 'breadcrumb__link',
                href: `#${crumb.path}`,
              },
              crumb.label
            )
          : h(
              'span',
              { class: 'breadcrumb__current', 'aria-current': isLast ? 'page' : null },
              crumb.label
            ),
      ]
      return parts
    })
  )

  const header = h(
    'header',
    { class: 'header' },
    h(
      'a',
      { class: 'brand', href: '#/', 'aria-label': 'My Agent Studio — início' },
      brandMark(),
      h('span', { class: 'brand__name' }, 'My Agent Studio')
    ),
    nav,
    h(
      'div',
      { class: 'header__actions' },
      searchButton,
      h(
        'span',
        { class: 'header__privacy' },
        icon('lock', { size: 13 }),
        h('span', { class: 'header__privacy-text' }, 'Local'),
        infoTooltip('Seus agentes permanecem neste navegador. Nada é enviado para servidores.', 'Sobre privacidade')
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn-ghost btn-icon',
          'aria-label': 'Ajuda',
          onclick: openHelp,
        },
        icon('life-buoy', { size: 17 })
      )
    )
  )

  on(header, 'click', (event) => {
    const target = /** @type {HTMLElement} */ (event.target)
    const link = target.closest('a[href^="#"]')
    if (!link) return
    const href = link.getAttribute('href') ?? ''
    if (href.startsWith('#/')) {
      event.preventDefault()
      navigate(href.slice(1))
    }
  })

  return header
}
