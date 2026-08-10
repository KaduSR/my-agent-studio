// @ts-check
/** Step 6 — Ferramentas (SPEC 29, 30). */

import { h, setChildren } from '../lib/dom.js'
import { icon } from '../icons.js'
import { TOOLS } from '../data/tools.js'
import { LIMITS } from '../agent/validate.js'
import { builderStore, toggleTool, updateTool } from '../stores/builder-store.js'
import { optionCard } from '../ui/option-card.js'
import { reactiveBlock, section, stepShell } from './step-shell.js'

/**
 * Per-tool configuration, revealed only once the tool is on (SPEC 30).
 * @param {import('../agent/types.js').AgentTool} tool
 * @param {import('../data/tools.js').ToolDefinition} definition
 * @returns {HTMLElement}
 */
function toolConfig(tool, definition) {
  const purposeId = `tool-purpose-${tool.id}`

  const purpose = h('input', {
    type: 'text',
    id: purposeId,
    class: 'input',
    value: tool.purpose ?? '',
    placeholder: definition.defaultPurpose,
    maxlength: String(LIMITS.toolPurposeMax),
    oninput: (/** @type {Event} */ event) => {
      updateTool(tool.id, { purpose: /** @type {HTMLInputElement} */ (event.target).value })
    },
  })

  const activeRules = tool.rules ?? []

  return h(
    'div',
    { class: 'tool-config' },
    h('label', { class: 'field-label', htmlFor: purposeId }, 'Para que ele usa esta ferramenta?'),
    purpose,
    definition.suggestedRules.length > 0
      ? h(
          'div',
          { class: 'tool-config__rules' },
          h('span', { class: 'helper' }, 'Cuidados ao usar:'),
          h(
            'div',
            { class: 'chip-row' },
            ...definition.suggestedRules.map((rule) => {
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

/** @returns {import('./step-shell.js').StepView} */
export function toolsStep() {
  const count = h('span')

  const grid = reactiveBlock(
    (state) =>
      state.agent.tools
        .map((tool) => `${tool.id}:${tool.enabled ? '1' : '0'}:${(tool.rules ?? []).length}`)
        .join('|'),
    (container) => {
      const tools = builderStore.getState().agent.tools
      const enabled = tools.filter((tool) => tool.enabled).length
      setChildren(
        count,
        h('span', { class: 'count-badge' }, `${enabled} ativa${enabled === 1 ? '' : 's'}`)
      )

      setChildren(
        container,
        h(
          'div',
          { class: 'tool-grid', role: 'group', 'aria-label': 'Ferramentas disponíveis' },
          ...TOOLS.map((definition) => {
            const tool = tools.find((candidate) => candidate.id === definition.id)
            if (!tool) return null

            return h(
              'div',
              { class: 'tool-cell', dataset: { enabled: String(tool.enabled) } },
              optionCard({
                role: 'checkbox',
                layout: 'row',
                label: definition.name,
                description: definition.description,
                iconName: definition.icon,
                focusKey: `tool-${definition.id}`,
                selected: tool.enabled,
                onToggle: () => toggleTool(definition.id),
              }),
              tool.enabled ? toolConfig(tool, definition) : null
            )
          })
        )
      )
    }
  )

  const element = stepShell(
    'tools',
    section(
      {
        title: 'Ferramentas',
        emoji: '🧰',
        description:
          'Isto declara o que seu agente espera ter disponível. O Agent Studio não conecta integrações reais.',
        aside: count,
      },
      grid.element
    )
  )

  return { element, destroy: grid.destroy }
}
