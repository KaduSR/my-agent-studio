// @ts-check
/**
 * Step 6 — Ferramentas (SPEC 29, 30).
 *
 * Twenty-six tools do not fit in a flat grid, so the step is organised the way
 * someone actually looks for one: a search box, the six categories, and a switch
 * to show only what is already on. The filter lives *outside* the reactive block
 * on purpose — inside it, every keystroke would rebuild the input and throw the
 * caret away.
 *
 * Each tool that is on asks three things, in the order that matters: what it is
 * for, how much rope it gets, and what to watch out for. The permission is the
 * one a harness acts on, which is why it is not buried under a details toggle.
 */

import { h, on, setChildren } from '../lib/dom.js'
import { icon } from '../icons.js'
import {
  TOOLS,
  TOOL_CATEGORIES,
  TOOL_PERMISSIONS,
  getToolCategory,
  getToolDefinition,
  getToolPermission,
} from '../data/tools.js'
import { LIMITS } from '../agent/validate.js'
import {
  addCustomTool,
  builderStore,
  removeCustomTool,
  setToolPermission,
  toggleTool,
  updateTool,
} from '../stores/builder-store.js'
import { optionCard, wireRadioGroup } from '../ui/option-card.js'
import { customToolDialog } from '../ui/custom-tool-dialog.js'
import { showToast } from '../ui/toast.js'
import { emptyState, reactiveBlock, section, stepShell } from './step-shell.js'

/**
 * Matches a tool against the search box: name, description and category label,
 * so "buscar" finds Web Search even though the word is not in its name.
 *
 * @param {import('../agent/types.js').AgentTool} tool
 * @param {import('../data/tools.js').ToolDefinition | undefined} definition
 * @param {string} query Already lowercased and trimmed.
 * @returns {boolean}
 */
function matches(tool, definition, query) {
  if (!query) return true
  const category = definition ? getToolCategory(definition.category)?.label : 'Personalizadas'
  return [tool.name, definition?.description ?? tool.description ?? '', category ?? '']
    .join(' ')
    .toLowerCase()
    .includes(query)
}

/**
 * How much rope the tool gets. Three cards rather than a select, for the same
 * reason as everywhere else in the builder: the options have to be readable
 * without opening anything.
 *
 * @param {import('../agent/types.js').AgentTool} tool
 * @returns {HTMLElement}
 */
function permissionPicker(tool) {
  const current = getToolPermission(
    tool.permission ?? getToolDefinition(tool.id)?.defaultPermission
  ).id

  const group = h(
    'div',
    { class: 'tool-permission', 'aria-label': `Permissão de ${tool.name}` },
    ...TOOL_PERMISSIONS.map((permission) =>
      optionCard({
        role: 'radio',
        layout: 'row',
        label: permission.label,
        description: permission.description,
        iconName: permission.icon,
        focusKey: `toolperm-${tool.id}-${permission.id}`,
        selected: permission.id === current,
        onToggle: () => setToolPermission(tool.id, permission.id),
      })
    )
  )
  wireRadioGroup(group)
  return group
}

/**
 * Per-tool configuration, revealed only once the tool is on (SPEC 30).
 * @param {import('../agent/types.js').AgentTool} tool
 * @param {import('../data/tools.js').ToolDefinition | undefined} definition
 * @returns {HTMLElement}
 */
function toolConfig(tool, definition) {
  const purposeId = `tool-purpose-${tool.id}`

  const purpose = h('input', {
    type: 'text',
    id: purposeId,
    class: 'input',
    value: tool.purpose ?? '',
    placeholder: definition?.defaultPurpose ?? 'Para que o agente usa esta ferramenta.',
    maxlength: String(LIMITS.toolPurposeMax),
    dataset: { focusKey: `toolpurpose-${tool.id}` },
    oninput: (/** @type {Event} */ event) => {
      updateTool(tool.id, { purpose: /** @type {HTMLInputElement} */ (event.target).value })
    },
  })

  const activeRules = tool.rules ?? []
  const suggested = definition?.suggestedRules ?? []

  return h(
    'div',
    { class: 'tool-config' },
    h('label', { class: 'field-label', htmlFor: purposeId }, 'Para que ele usa esta ferramenta?'),
    purpose,
    h('span', { class: 'helper' }, 'Quanta liberdade ela tem:'),
    permissionPicker(tool),
    suggested.length > 0
      ? h(
          'div',
          { class: 'tool-config__rules' },
          h('span', { class: 'helper' }, 'Cuidados ao usar:'),
          h(
            'div',
            { class: 'chip-row' },
            ...suggested.map((rule) => {
              const selected = activeRules.includes(rule)
              return h(
                'button',
                {
                  type: 'button',
                  class: 'chip',
                  role: 'checkbox',
                  'aria-checked': String(selected),
                  dataset: { focusKey: `toolrule-${tool.id}-${rule}` },
                  onclick: () => {
                    const next = selected
                      ? activeRules.filter((entry) => entry !== rule)
                      : [...activeRules, rule]
                    updateTool(tool.id, { rules: next })
                  },
                },
                selected
                  ? h('span', { class: 'chip__check', 'aria-hidden': 'true' }, icon('check', { size: 13 }))
                  : null,
                h('span', null, rule)
              )
            })
          )
        )
      : null
  )
}

/**
 * @param {import('../agent/types.js').AgentTool} tool
 * @param {import('../data/tools.js').ToolDefinition | undefined} definition
 * @returns {HTMLElement}
 */
function toolCell(tool, definition) {
  return h(
    'div',
    {
      class: tool.custom ? 'tool-cell tool-cell--custom' : 'tool-cell',
      dataset: { enabled: String(tool.enabled) },
    },
    h(
      'div',
      { class: 'tool-cell__head' },
      optionCard({
        role: 'checkbox',
        layout: 'row',
        label: tool.name,
        description: definition?.description ?? tool.description ?? 'Ferramenta declarada por você.',
        iconName: definition?.icon ?? 'plug',
        focusKey: `tool-${tool.id}`,
        selected: tool.enabled,
        onToggle: () => toggleTool(tool.id),
      }),
      // Only a custom tool can be deleted: a catalogue tool is simply switched
      // off, and offering to remove it would suggest the catalogue shrinks.
      tool.custom
        ? h(
            'button',
            {
              type: 'button',
              class: 'tool-cell__remove',
              'aria-label': `Remover ferramenta: ${tool.name}`,
              title: 'Remover',
              onclick: () => removeCustomTool(tool.id),
            },
            icon('trash-2', { size: 15 })
          )
        : null
    ),
    tool.enabled ? toolConfig(tool, definition) : null
  )
}

/** @returns {import('./step-shell.js').StepView} */
export function toolsStep() {
  const count = h('span')

  /* ------------------------------- filters ------------------------------ */

  // Local to the step, not builder state: a filter is how someone is looking at
  // the catalogue right now, not something the exported agent should carry.
  let query = ''
  let category = 'all'
  let onlyEnabled = false

  const search = h('input', {
    type: 'search',
    class: 'input tool-filters__search',
    placeholder: 'Buscar ferramenta',
    'aria-label': 'Buscar ferramenta',
    autocomplete: 'off',
  })

  const categoryRow = h('div', { class: 'tool-filters__categories', role: 'group', 'aria-label': 'Categorias' })
  const enabledToggle = h(
    'button',
    {
      type: 'button',
      class: 'chip',
      'aria-pressed': 'false',
      onclick: () => {
        onlyEnabled = !onlyEnabled
        enabledToggle.setAttribute('aria-pressed', String(onlyEnabled))
        refresh()
      },
    },
    icon('filter', { size: 13 }),
    h('span', null, 'Só as ativas')
  )

  const filters = h(
    'div',
    { class: 'tool-filters' },
    h('div', { class: 'tool-filters__row' }, search, enabledToggle),
    categoryRow
  )

  const renderCategories = () => {
    /** @type {Array<{ id: string, label: string }>} */
    const options = [{ id: 'all', label: 'Todas' }, ...TOOL_CATEGORIES]
    setChildren(
      categoryRow,
      ...options.map((option) =>
        h(
          'button',
          {
            type: 'button',
            class: 'chip',
            'aria-pressed': String(option.id === category),
            onclick: () => {
              category = option.id
              renderCategories()
              refresh()
            },
          },
          h('span', null, option.label)
        )
      )
    )
  }

  /* -------------------------------- grid -------------------------------- */

  /**
   * @param {HTMLElement} container
   * @returns {void}
   */
  const renderGrid = (container) => {
    const tools = builderStore.getState().agent.tools
    const enabled = tools.filter((tool) => tool.enabled).length
    const needle = query.trim().toLowerCase()

    setChildren(
      count,
      h('span', { class: 'count-badge' }, `${enabled} de ${tools.length} ativas`)
    )

    const visible = tools.filter((tool) => {
      const definition = getToolDefinition(tool.id)
      if (onlyEnabled && !tool.enabled) return false
      if (category !== 'all') {
        const own = tool.custom ? 'custom' : definition?.category
        if (own !== category) return false
      }
      return matches(tool, definition, needle)
    })

    const addButton = h(
      'button',
      {
        type: 'button',
        class: 'tool-add',
        onclick: async () => {
          const input = await customToolDialog()
          if (!input) return
          const id = addCustomTool(input)
          if (id) showToast({ message: `${input.name} adicionada.`, variant: 'success' })
        },
      },
      h('span', { class: 'tool-add__icon' }, icon('plus', { size: 18 })),
      h(
        'span',
        { class: 'tool-add__text' },
        h('span', { class: 'tool-add__label' }, 'Adicionar ferramenta'),
        h(
          'span',
          { class: 'tool-add__description' },
          'Um servidor MCP ou uma integração interna que não está no catálogo.'
        )
      )
    )

    if (visible.length === 0) {
      setChildren(
        container,
        emptyState({
          iconName: 'search',
          title: 'Nenhuma ferramenta encontrada',
          description: 'Ajuste a busca ou escolha outra categoria.',
          actionLabel: 'Limpar filtros',
          onAction: () => {
            query = ''
            category = 'all'
            onlyEnabled = false
            search.value = ''
            enabledToggle.setAttribute('aria-pressed', 'false')
            renderCategories()
            refresh()
          },
        }),
        addButton
      )
      return
    }

    // Grouped by category, so the grid reads as a shelf rather than a pile.
    // Custom tools get a group of their own, at the end, where they belong.
    /** @type {Array<{ id: string, label: string, description: string, tools: import('../agent/types.js').AgentTool[] }>} */
    const groups = []
    for (const definition of TOOL_CATEGORIES) {
      const own = visible.filter(
        (tool) => !tool.custom && getToolDefinition(tool.id)?.category === definition.id
      )
      if (own.length > 0) {
        groups.push({ id: definition.id, label: definition.label, description: definition.description, tools: own })
      }
    }
    const custom = visible.filter((tool) => tool.custom)
    if (custom.length > 0) {
      groups.push({
        id: 'custom',
        label: 'Suas ferramentas',
        description: 'Declaradas por você, fora do catálogo.',
        tools: custom,
      })
    }

    setChildren(
      container,
      ...groups.map((group) =>
        h(
          'div',
          { class: 'tool-group' },
          h(
            'div',
            { class: 'tool-group__header' },
            h('h3', { class: 'tool-group__title' }, group.label),
            h('p', { class: 'tool-group__description helper' }, group.description)
          ),
          h(
            'div',
            { class: 'tool-grid', role: 'group', 'aria-label': group.label },
            ...group.tools.map((tool) => toolCell(tool, getToolDefinition(tool.id)))
          )
        )
      ),
      addButton
    )
  }

  const grid = reactiveBlock(
    // Permission and the tool list itself belong in the key: without them,
    // switching a permission or adding a custom tool would change state that
    // nothing re-renders. Purpose is deliberately absent, so typing in it does
    // not rebuild the input under the caret.
    (state) =>
      state.agent.tools
        .map(
          (tool) =>
            `${tool.id}:${tool.enabled ? '1' : '0'}:${tool.permission ?? ''}:${(tool.rules ?? []).length}`
        )
        .join('|'),
    renderGrid
  )

  const refresh = () => renderGrid(grid.element)

  on(search, 'input', () => {
    query = search.value
    refresh()
  })

  renderCategories()

  const element = stepShell(
    'tools',
    section(
      {
        title: 'Ferramentas',
        emoji: '🧰',
        description: `Isto declara o que seu agente espera ter disponível, e com quanta liberdade. São ${TOOLS.length} no catálogo, e você pode acrescentar as suas. O Agent Studio não conecta integrações reais.`,
        aside: count,
      },
      filters,
      grid.element
    )
  )

  return { element, destroy: grid.destroy }
}
