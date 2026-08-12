// @ts-check
/**
 * The office: one team, its desks, and the two ways it can work.
 *
 * The screen is built from three reactive islands rather than one re-render,
 * because the desks carry uncontrolled text inputs. Rebuilding the room on every
 * keystroke would take the caret with it, which is the same reason the builder's
 * fields own their own values (ui/field.js).
 *
 * The subscriptions are therefore deliberately narrow: the office watches a
 * *structural* signature (mode, manager, who is seated) and nothing about what
 * anyone typed.
 */

import { h, on, setChildren } from '../lib/dom.js'
import { icon } from '../icons.js'
import { textField } from '../ui/field.js'
import { optionCard, wireRadioGroup } from '../ui/option-card.js'
import { announce, showToast } from '../ui/toast.js'
import { officeDesk } from '../components/office-desk.js'
import { hueMap } from '../ui/office-sprite.js'
import { agentBench } from '../components/agent-bench.js'
import { getAgent, libraryStore } from '../stores/library-store.js'
import {
  addMember,
  flushTeamWrites,
  getTeam,
  removeMember,
  moveMember,
  setLead,
  setMemberInstruction,
  setTeamMode,
  teamsStore,
  updateTeamFields,
} from '../stores/teams-store.js'
import { TEAM_LIMITS } from '../team/defaults.js'
import { TEAM_MODES, getTeamMode, leadLabel } from '../data/team-modes.js'
import { LIMITS } from '../agent/validate.js'
import {
  canExportTeam,
  copyTeamMarkdown,
  copyTeamPrompt,
  downloadTeamKit,
  downloadTeamMarkdown,
  getTeamExportBlockers,
} from '../team/export.js'
import { resolveSeats } from '../team/markdown.js'
import { navigate } from '../router.js'
import { logger } from '../lib/logger.js'

/** @typedef {import('../team/types.js').Team} Team */

/**
 * The structural fingerprint of a team: everything the room's *shape* depends
 * on, and nothing anybody typed. A string keeps the shallow comparison exact.
 * @param {Team | undefined} team
 * @returns {string}
 */
function officeSignature(team) {
  if (!team) return ''
  return `${team.mode}|${team.leadId}|${team.members.map((member) => member.agentId).join(';')}`
}

/**
 * @param {string} teamId
 * @returns {{ element: HTMLElement, destroy: () => void }}
 */
export function teamView(teamId) {
  /** @returns {Team | undefined} */
  const current = () => getTeam(teamId)

  const modes = h('div', { class: 'office-modes', 'aria-label': 'Como o time trabalha' })
  const office = h('section', { class: 'office' })
  const bench = h('div', { class: 'bench-slot' })
  const exportRow = h('div', { class: 'team-office__export' })

  /* ------------------------------ motion ---------------------------------- */

  /*
   * WCAG 2.2.2 asks for a way to stop motion that starts on its own and does not
   * end. The global prefers-reduced-motion rule covers the people who set that
   * preference; this covers everyone else. It starts paused for the former, so
   * the button label is honest either way.
   */
  let paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  office.dataset.motion = paused ? 'paused' : 'running'

  const motionLabel = h('span', null, paused ? 'Animar' : 'Pausar animação')
  const motionButton = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-ghost btn-sm',
      'aria-pressed': String(paused),
      onclick: () => {
        paused = !paused
        office.dataset.motion = paused ? 'paused' : 'running'
        motionButton.setAttribute('aria-pressed', String(paused))
        motionLabel.textContent = paused ? 'Animar' : 'Pausar animação'
        announce(paused ? 'Animação pausada.' : 'Animação ativada.')
      },
    },
    icon('zap', { size: 15 }),
    motionLabel
  )

  /* ------------------------------- identity ------------------------------- */

  const seed = /** @type {Team} */ (current())

  const nameField = textField({
    label: 'Nome do time',
    value: seed.name,
    placeholder: 'Ex.: Time de conteúdo',
    maxLength: LIMITS.teamNameMax,
    required: true,
    autofocus: true,
    validateAs: 'teamName',
    onInput: (value) => {
      updateTeamFields(teamId, { name: value })
      renderExport()
    },
  })

  const objectiveField = textField({
    label: 'Objetivo do time',
    value: seed.objective,
    placeholder: 'O que este time precisa entregar, junto.',
    maxLength: LIMITS.teamObjectiveMax,
    multiline: true,
    rows: 3,
    helper: 'É o alvo que o time inteiro persegue, e é ele que o laço tenta atingir. Cada agente ainda tem o seu.',
    validateAs: 'teamObjective',
    onInput: (value) => {
      updateTeamFields(teamId, { objective: value })
      renderExport()
    },
  })

  /* --------------------------------- modes -------------------------------- */

  function renderModes() {
    const team = current()
    if (!team) return

    setChildren(
      modes,
      ...TEAM_MODES.map((mode) =>
        optionCard({
          label: mode.label,
          description: mode.description,
          iconName: mode.icon,
          role: 'radio',
          layout: 'row',
          selected: team.mode === mode.id,
          focusKey: `mode-${mode.id}`,
          onToggle: () => {
            const next = setTeamMode(teamId, mode.id)
            if (!next) return

            const role = (mode.leadLabel ?? 'líder').toLowerCase()
            const holder = next.leadId ? getAgent(next.leadId)?.name.trim() : ''
            announce(
              !mode.lead
                ? `Modo alterado para ${mode.label.toLowerCase()}.`
                : holder
                  ? `Modo alterado para ${mode.label.toLowerCase()}. ${holder} é o ${role}.`
                  : `Modo alterado para ${mode.label.toLowerCase()}. Escolha quem é o ${role}.`
            )
          },
        })
      )
    )
    wireRadioGroup(modes)
  }

  /* -------------------------------- the room ------------------------------ */

  /**
   * @param {Team} team
   * @param {import('../team/types.js').TeamMember} member
   * @param {number} index
   * @param {boolean} head
   * @param {Map<string, number>} hues
   * @returns {HTMLElement}
   */
  function desk(team, member, index, head, hues) {
    const agent = getAgent(member.agentId)
    const name = agent?.name.trim() || 'este agente'
    const sequential = getTeamMode(team.mode).sequential

    return officeDesk({
      member,
      agent,
      mode: team.mode,
      isLead: team.leadId === member.agentId,
      head,
      index,
      hue: hues.get(member.agentId) ?? 0,
      step: sequential ? index + 1 : undefined,
      canMoveUp: index > 0,
      canMoveDown: index < team.members.length - 1,
      onInstruction: (value) => setMemberInstruction(teamId, member.agentId, value),
      onPromote: () => {
        if (!setLead(teamId, member.agentId)) return
        announce(`${name} agora é o ${leadLabel(team.mode).toLowerCase()} do time.`)
      },
      onMove: (delta) => {
        const next = moveMember(teamId, member.agentId, delta)
        if (!next) return
        const position = next.members.findIndex((entry) => entry.agentId === member.agentId) + 1
        announce(`${name} foi para a etapa ${position} de ${next.members.length}.`)
        requestAnimationFrame(() => {
          deskElement(member.agentId)?.querySelector('button')?.focus()
        })
      },
      onRemove: () => {
        if (!removeMember(teamId, member.agentId)) return
        announce(`${name} saiu do time.`)
        focusOffice()
      },
    })
  }

  function renderOffice() {
    const team = current()
    if (!team) return

    office.dataset.mode = team.mode

    if (team.members.length === 0) {
      setChildren(
        office,
        h('div', { class: 'office__floor' }),
        h(
          'p',
          { class: 'office__empty helper' },
          icon('briefcase', { size: 16 }),
          'Nenhuma mesa ocupada ainda. Escolha um agente na lista abaixo.'
        )
      )
      return
    }

    const definition = getTeamMode(team.mode)
    const leadIndex = team.members.findIndex((member) => member.agentId === team.leadId)
    const showHead = Boolean(definition.lead) && leadIndex !== -1
    const rest = team.members.filter((_, index) => !showHead || index !== leadIndex)
    // Colours are assigned across the whole roster at once, so no two desks in
    // this room can end up the same.
    const hues = hueMap(team.members.map((member) => member.agentId))

    office.dataset.layout = definition.layout

    if (definition.layout === 'flow' && definition.flow) {
      setChildren(
        office,
        h('div', { class: 'office__floor' }),
        renderFlow(team, definition, hues, leadIndex),
        definition.lead && !showHead
          ? h(
              'p',
              { class: 'office__hint helper-error' },
              `Escolha quem é o ${(definition.leadLabel ?? 'líder').toLowerCase()}: use "${definition.promoteLabel}" em uma das mesas.`
            )
          : h('p', { class: 'office__hint helper' }, definition.caption)
      )
      return
    }

    setChildren(
      office,
      h('div', { class: 'office__floor' }),
      // The head desk is the visible difference a lead makes: one agent sits
      // apart, with a line running down to everyone else.
      showHead
        ? h('ul', { class: 'office__head' }, desk(team, team.members[leadIndex], leadIndex, true, hues))
        : null,
      showHead ? h('span', { class: 'office__spine', 'aria-hidden': 'true' }) : null,
      h(
        'ul',
        { class: 'office__desks', dataset: definition.sequential ? { flow: 'chain' } : {} },
        ...rest.map((member) => desk(team, member, team.members.indexOf(member), false, hues))
      ),
      definition.lead && !showHead
        ? h(
            'p',
            { class: 'office__hint helper-error' },
            `Escolha quem é o ${(definition.leadLabel ?? 'líder').toLowerCase()}: use "${definition.promoteLabel}" em uma das mesas.`
          )
        : h('p', { class: 'office__hint helper' }, definition.caption)
    )
  }

  /**
   * A labelled arrow between two nodes.
   *
   * Decorative: the direction is already in the reading order of the track, and
   * the words are said once in the caption underneath. Announcing "entrega para"
   * between every pair of names would be noise in a screen reader.
   *
   * @param {string} label
   * @returns {HTMLElement}
   */
  function edge(label) {
    return h(
      'li',
      { class: 'flow__edge', 'aria-hidden': 'true' },
      h('span', { class: 'flow__edge-line' }),
      h('span', { class: 'flow__edge-label' }, label)
    )
  }

  /**
   * @param {string} label
   * @param {'start' | 'end'} kind
   * @returns {HTMLElement}
   */
  function terminal(label, kind) {
    return h(
      'li',
      { class: `flow__terminal flow__terminal--${kind}` },
      icon(kind === 'start' ? 'crosshair' : 'check', { size: 14 }),
      label
    )
  }

  /**
   * The office drawn as a pipeline.
   *
   * Two shapes so far. A chain is a straight line: work enters, passes through
   * each agent in desk order, and leaves. A review is a loop: the producers hand
   * over to the evaluator, who either lets it out or sends it back, and that
   * return arrow is the whole reason the mode exists, so it is drawn rather than
   * described.
   *
   * @param {Team} team
   * @param {import('../data/team-modes.js').TeamModeDefinition} definition
   * @param {Map<string, number>} hues
   * @param {number} leadIndex
   * @returns {HTMLElement}
   */
  function renderFlow(team, definition, hues, leadIndex) {
    const flow = /** @type {import('../data/team-modes.js').FlowShape} */ (definition.flow)
    const node = (/** @type {number} */ index) =>
      desk(team, team.members[index], index, false, hues)

    if (!definition.lead) {
      /** @type {HTMLElement[]} */
      const track = [terminal(flow.start, 'start')]
      team.members.forEach((_, index) => {
        track.push(edge(index === 0 ? flow.enter : flow.forward), node(index))
      })
      track.push(edge(flow.finish), terminal(flow.end, 'end'))

      return h('ul', { class: 'flow', dataset: { shape: 'chain' } }, ...track)
    }

    const producers = team.members
      .map((_, index) => index)
      .filter((index) => index !== leadIndex)

    return h(
      'div',
      { class: 'flow-loop' },
      h(
        'ul',
        { class: 'flow', dataset: { shape: 'review' } },
        terminal(flow.start, 'start'),
        edge(flow.enter),
        h('li', { class: 'flow__group' }, h('ul', { class: 'flow__stack' }, ...producers.map(node))),
        edge(flow.forward),
        leadIndex === -1
          ? h('li', { class: 'flow__gap helper-error' }, 'Sem avaliador')
          : h('li', { class: 'flow__group flow__group--lead' }, node(leadIndex)),
        edge(flow.finish),
        terminal(flow.end, 'end')
      ),
      // The feedback edge, drawn under the row and pointing back.
      flow.back
        ? h(
            'p',
            { class: 'flow__return', 'aria-hidden': 'true' },
            h('span', { class: 'flow__return-arrow' }),
            h('span', { class: 'flow__return-label' }, flow.back)
          )
        : null
    )
  }

  /**
   * The desk an agent is sitting at.
   *
   * Compared by dataset rather than looked up with an attribute selector: a
   * selector would need CSS.escape, which is one more thing to be right about
   * for no gain, since this only ever has a handful of desks to walk.
   *
   * @param {string} agentId
   * @returns {HTMLElement | null}
   */
  function deskElement(agentId) {
    for (const node of office.querySelectorAll('.desk')) {
      const el = /** @type {HTMLElement} */ (node)
      if (el.dataset.focusKey === agentId) return el
    }
    return null
  }

  /** Put focus back in the room after the desk it was standing on disappeared. */
  function focusOffice() {
    requestAnimationFrame(() => {
      const target = /** @type {HTMLElement | null} */ (
        office.querySelector('.desk button') ?? bench.querySelector('.bench__agent')
      )
      target?.focus()
    })
  }

  /* -------------------------------- the bench ----------------------------- */

  function renderBench() {
    const team = current()
    if (!team) return

    setChildren(
      bench,
      agentBench({
        team,
        onSeat: (agentId) => {
          const name = getAgent(agentId)?.name.trim() || 'O agente'
          if (team.members.length >= TEAM_LIMITS.maxMembers) {
            showToast({
              message: `O time está cheio (${TEAM_LIMITS.maxMembers} agentes).`,
              variant: 'error',
            })
            return
          }
          if (!addMember(teamId, agentId)) return
          announce(
            `${name} entrou no time. ${(current()?.members.length ?? 0)} de ${TEAM_LIMITS.maxMembers} mesas ocupadas.`
          )
          // Focus follows the agent to their new desk, so a keyboard user is not
          // left standing on a bench button that just disappeared.
          requestAnimationFrame(() => {
            const seat = /** @type {HTMLElement | null} */ (
              deskElement(agentId)?.querySelector('button') ?? null
            )
            seat?.focus()
          })
        },
      })
    )
  }

  /* -------------------------------- exporting ----------------------------- */

  function renderExport() {
    const team = current()
    if (!team) return

    const blockers = getTeamExportBlockers(team)
    const ready = canExportTeam(team)
    const seats = () => resolveSeats(/** @type {Team} */ (current()), getAgent)

    /**
     * @param {string} label
     * @param {string} iconName
     * @param {string} klass
     * @param {() => void} onClick
     */
    const action = (label, iconName, klass, onClick) =>
      h(
        'button',
        { type: 'button', class: klass, disabled: !ready, onclick: onClick },
        icon(/** @type {any} */ (iconName), { size: 15 }),
        label
      )

    setChildren(
      exportRow,
      h('h2', { class: 'section-title' }, 'Levar o time'),
      h(
        'p',
        { class: 'helper' },
        'O kit é a pasta que o Claude Code lê: um CLAUDE.md com o objetivo e o laço, e um subagente por integrante em .claude/agents/. O prompt e o Markdown descrevem o mesmo time em um texto só.'
      ),
      h(
        'div',
        { class: 'team-office__export-actions' },
        action('Baixar kit para Claude Code', 'package', 'btn btn-primary btn-sm', async () => {
          try {
            await downloadTeamKit(team, seats())
            showToast({ message: 'Kit do time exportado.', variant: 'success' })
          } catch (error) {
            logger.error('Team ZIP generation failed', error)
            showToast({
              message: 'Não foi possível gerar o arquivo. Tente novamente.',
              variant: 'error',
            })
          }
        }),
        action('Copiar prompt', 'clipboard-check', 'btn btn-secondary btn-sm', async () => {
          const ok = await copyTeamPrompt(team, seats())
          showToast({
            message: ok ? 'Prompt do time copiado.' : 'Não foi possível copiar.',
            variant: ok ? 'success' : 'error',
          })
        }),
        action('Copiar Markdown', 'copy', 'btn btn-secondary btn-sm', async () => {
          const ok = await copyTeamMarkdown(team, seats())
          showToast({
            message: ok ? 'Markdown copiado.' : 'Não foi possível copiar.',
            variant: ok ? 'success' : 'error',
          })
        }),
        action('Baixar .md', 'download', 'btn btn-secondary btn-sm', () => {
          downloadTeamMarkdown(team, seats())
          showToast({ message: 'Time exportado.', variant: 'success' })
        })
      ),
      blockers.length > 0
        ? h(
            'ul',
            { class: 'team-office__blockers' },
            ...blockers.map((blocker) =>
              h('li', { class: 'helper-error' }, icon('alert-circle', { size: 13 }), blocker)
            )
          )
        : null
    )
  }

  /* --------------------------------- wiring ------------------------------- */

  renderModes()
  renderOffice()
  renderBench()
  renderExport()

  const stopStructure = teamsStore.select(
    (state) => officeSignature(state.teams.find((team) => team.id === teamId)),
    () => {
      renderModes()
      renderOffice()
      renderBench()
      renderExport()
    }
  )

  // A rename or a deletion in the builder has to reach the desks and the bench:
  // that is what turns a desk into an empty chair without a reload.
  const stopLibrary = libraryStore.select((state) => state.agents, () => {
    renderOffice()
    renderBench()
    renderExport()
  })

  /*
   * `destroy` covers navigating away inside the app, but a reload or a closed tab
   * tears the whole context down without running it, and the pending write would
   * go with it. pagehide is the event that still fires in both cases.
   */
  const stopUnload = on(window, 'pagehide', () => flushTeamWrites())

  const element = h(
    'div',
    { class: 'team-office' },
    h(
      'header',
      { class: 'team-office__header' },
      h(
        'div',
        { class: 'team-office__fields' },
        nameField.element,
        objectiveField.element
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn-ghost btn-sm',
          onclick: () => navigate('/times'),
        },
        icon('arrow-left', { size: 15 }),
        'Todos os times'
      )
    ),
    h(
      'section',
      { class: 'team-office__mode' },
      h(
        'div',
        { class: 'team-office__mode-head' },
        h('h2', { class: 'section-title' }, 'Como o time trabalha'),
        motionButton
      ),
      modes
    ),
    office,
    bench,
    exportRow
  )

  return {
    element,
    destroy: () => {
      stopStructure()
      stopLibrary()
      stopUnload()
      // Flush, never cancel: this view is destroyed on every navigation, and the
      // pending write holds the last thing the user typed.
      flushTeamWrites()
    },
  }
}
