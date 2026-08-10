// @ts-check
/**
 * Application bootstrap.
 *
 * Owns the shell, the route -> view mapping, and the lifecycle rules that decide
 * which agent the builder is editing: a saved one, a restored draft, or the
 * worked example a first-time visitor sees (SPEC 75).
 */

import { h, setChildren, query } from './lib/dom.js'
import { icon } from './icons.js'
import { appHeader } from './components/app-header.js'
import { homeView } from './views/home.js'
import { libraryView } from './views/library.js'
import { builderView } from './views/builder.js'
import { loadAgent } from './stores/builder-store.js'
import { getAgent, loadLibrary, reviveAgent } from './stores/library-store.js'
import { setPersisted, startAutosave } from './stores/autosave.js'
import { createAgentFromTemplate, createEmptyAgent } from './agent/defaults.js'
import { isTemplateId } from './data/templates.js'
import { readJSON, STORAGE_KEYS } from './lib/storage.js'
import { currentRoute, navigate, replacePath, startRouter } from './router.js'
import { registerPaletteShortcut } from './ui/command-palette.js'
import { showToast } from './ui/toast.js'
import { trackEvent } from './lib/analytics.js'

/** @typedef {{ element: HTMLElement, destroy?: () => void }} View */

const root = query('#app')

/** @type {View | null} */
let activeView = null

/**
 * Decide which agent a fresh `/studio/new` should start from.
 *
 * An explicitly chosen template always wins: the user asked for that role, so
 * silently restoring an unrelated draft over it would be wrong. The draft is
 * left in storage either way and comes back on the next plain `/studio/new`.
 *
 * @param {string | undefined} templateId
 * @returns {import('./agent/types.js').Agent}
 */
function agentForNewRoute(templateId) {
  if (templateId) {
    if (!isTemplateId(templateId)) {
      showToast({ message: 'Modelo não encontrado. Começando do zero.', variant: 'error' })
      trackEvent('agent_created', {})
      return createEmptyAgent()
    }
    trackEvent('agent_created', { template: templateId })
    return createAgentFromTemplate(templateId)
  }

  // The draft goes through the same revival as the library, so a record written
  // by an older version comes back complete rather than subtly malformed.
  const draft = reviveAgent(readJSON(STORAGE_KEYS.draft, /** @type {unknown} */ (null)))
  if (draft) {
    showToast({ message: 'Rascunho restaurado.', variant: 'info' })
    trackEvent('draft_restored', { agentId: draft.id })
    return draft
  }

  trackEvent('agent_created', {})
  return createEmptyAgent()
}

/**
 * @param {import('./router.js').RouteMatch} route
 * @returns {{ view: View, crumbs: import('./components/app-header.js').Crumb[] }}
 */
function resolveRoute(route) {
  if (route.name === 'library') {
    return { view: libraryView(), crumbs: [{ label: 'Estúdio', path: '/' }, { label: 'Meus agentes' }] }
  }

  if (route.name === 'new') {
    const agent = agentForNewRoute(route.params.template)
    loadAgent(agent)
    setPersisted(false)
    return {
      view: builderView(),
      crumbs: [
        { label: 'Estúdio', path: '/' },
        { label: 'Meus agentes', path: '/studio' },
        { label: route.params.template ? agent.name : 'Novo agente' },
      ],
    }
  }

  if (route.name === 'edit') {
    const agent = getAgent(route.params.id)
    if (!agent) {
      return {
        view: notFoundView(
          'Agente não encontrado',
          'Ele pode ter sido excluído, ou foi criado em outro navegador.'
        ),
        crumbs: [{ label: 'Estúdio', path: '/' }, { label: 'Meus agentes', path: '/studio' }, { label: 'Não encontrado' }],
      }
    }

    loadAgent(agent)
    setPersisted(true)
    return {
      view: builderView(),
      crumbs: [
        { label: 'Estúdio', path: '/' },
        { label: 'Meus agentes', path: '/studio' },
        { label: agent.name || 'Agente sem nome' },
      ],
    }
  }

  if (route.name === 'home') {
    return { view: homeView(), crumbs: [{ label: 'Estúdio' }] }
  }

  return {
    view: notFoundView('Página não encontrada', 'O endereço acessado não existe no My Agent Studio.'),
    crumbs: [{ label: 'Estúdio', path: '/' }, { label: 'Não encontrado' }],
  }
}

/**
 * @param {string} title
 * @param {string} description
 * @returns {View}
 */
function notFoundView(title, description) {
  return {
    element: h(
      'div',
      { class: 'not-found' },
      h(
        'div',
        { class: 'empty-state' },
        h('span', { class: 'empty-state__icon' }, icon('alert-circle', { size: 22 })),
        h('p', { class: 'empty-state__title' }, title),
        h('p', { class: 'empty-state__description helper' }, description),
        h(
          'button',
          { type: 'button', class: 'btn btn-primary btn-sm', onclick: () => navigate('/studio') },
          'Ver meus agentes'
        )
      )
    ),
  }
}

/**
 * @param {import('./router.js').RouteMatch} route
 * @returns {void}
 */
function renderRoute(route) {
  activeView?.destroy?.()

  const { view, crumbs } = resolveRoute(route)
  activeView = view

  const isBuilder = route.name === 'new' || route.name === 'edit'
  setChildren(
    root,
    appHeader(crumbs),
    isBuilder ? view.element : h('main', { class: 'page', id: 'main', tabindex: '-1' }, view.element)
  )

  document.title =
    route.name === 'home' ? 'My Agent Studio' : `${crumbs[crumbs.length - 1].label} — My Agent Studio`
}

function start() {
  loadLibrary()
  registerPaletteShortcut()

  startAutosave({
    onPromote: (agent) => {
      // The agent now has a permanent home; give it a permanent URL without
      // pushing a history entry the user did not ask for.
      if (currentRoute().name === 'new') replacePath(`/studio/${agent.id}`)
    },
  })

  startRouter(renderRoute)
}

start()
