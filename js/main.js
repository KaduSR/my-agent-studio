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
import { teamsView } from './views/teams.js'
import { teamView } from './views/team.js'
import { loadAgent } from './stores/builder-store.js'
import { getAgent, loadLibrary, reviveAgent } from './stores/library-store.js'
import { getTeam, loadTeams, saveTeam } from './stores/teams-store.js'
import { createEmptyTeam } from './team/defaults.js'
import { takePendingAgent } from './stores/pending-agent.js'
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
 * An imported file wins over everything: it is the one source that cannot be
 * rebuilt from the URL, so losing it to a restored draft would be unrecoverable.
 * After that an explicitly chosen template wins: the user asked for that role,
 * so silently restoring an unrelated draft over it would be wrong. The draft is
 * left in storage either way and comes back on the next plain `/studio/new`.
 *
 * @param {string | undefined} templateId
 * @returns {import('./agent/types.js').Agent}
 */
function agentForNewRoute(templateId) {
  const imported = takePendingAgent()
  if (imported) return imported

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
    return { view: libraryView(), crumbs: [{ label: 'Início', path: '/' }, { label: 'Meus agentes' }] }
  }

  if (route.name === 'new') {
    const agent = agentForNewRoute(route.params.template)
    loadAgent(agent)
    setPersisted(false)
    return {
      view: builderView(),
      crumbs: [
        { label: 'Início', path: '/' },
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
        crumbs: [{ label: 'Início', path: '/' }, { label: 'Meus agentes', path: '/studio' }, { label: 'Não encontrado' }],
      }
    }

    loadAgent(agent)
    setPersisted(true)
    return {
      view: builderView(),
      crumbs: [
        { label: 'Início', path: '/' },
        { label: 'Meus agentes', path: '/studio' },
        { label: agent.name || 'Agente sem nome' },
      ],
    }
  }

  if (route.name === 'teams') {
    return {
      view: teamsView(),
      crumbs: [{ label: 'Início', path: '/' }, { label: 'Times de agentes' }],
    }
  }

  if (route.name === 'team-new') {
    const team = createEmptyTeam()
    saveTeam(team)
    trackEvent('team_created', {})
    /*
     * The team earns its permanent URL immediately. history.replaceState fires no
     * hashchange, so this does not re-enter renderRoute. A team is a container
     * the user asked for from a list that already has a delete action, so it does
     * not need the draft-and-promote dance an agent gets.
     */
    replacePath(`/times/${team.id}`)
    return {
      view: teamView(team.id),
      crumbs: [
        { label: 'Início', path: '/' },
        { label: 'Times de agentes', path: '/times' },
        { label: 'Novo time' },
      ],
    }
  }

  if (route.name === 'team') {
    const team = getTeam(route.params.id)
    if (!team) {
      return {
        view: notFoundView(
          'Time não encontrado',
          'Ele pode ter sido excluído, ou foi criado em outro navegador.'
        ),
        crumbs: [
          { label: 'Início', path: '/' },
          { label: 'Times de agentes', path: '/times' },
          { label: 'Não encontrado' },
        ],
      }
    }

    return {
      view: teamView(team.id),
      crumbs: [
        { label: 'Início', path: '/' },
        { label: 'Times de agentes', path: '/times' },
        { label: team.name.trim() || 'Time sem nome' },
      ],
    }
  }

  if (route.name === 'home') {
    // No crumb on the home page: it would repeat the brand link beside it.
    return { view: homeView(), crumbs: [] }
  }

  return {
    view: notFoundView('Página não encontrada', 'O endereço acessado não existe no My Agent Studio.'),
    crumbs: [{ label: 'Início', path: '/' }, { label: 'Não encontrado' }],
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

}

function start() {
  loadLibrary()
  // After the library, deliberately: a team is a seating chart over saved
  // agents, so the agents have to exist before the first office renders.
  loadTeams()
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
