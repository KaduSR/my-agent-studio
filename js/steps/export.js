// @ts-check
/** Step 8 — Exportar (SPEC 36, 37, 39, 40, 50). */

import { h, setChildren } from '../lib/dom.js'
import { icon } from '../icons.js'
import { DEFAULT_PRESET, PRESET_FAMILIES, getPreset, presetsInFamily } from '../agent/presets.js'
import { getPromptTarget } from '../agent/prompts.js'
import { buildFileTree, exportRootName } from '../agent/files.js'
import { getExportBlockers } from '../agent/validate.js'
import {
  copyAgentMarkdown,
  copyCreationPrompt,
  downloadAgentJson,
  downloadAgentMarkdown,
  downloadAgentZip,
  downloadConfigJson,
  downloadCreationPrompt,
} from '../agent/export.js'
import { builderStore, setStep } from '../stores/builder-store.js'
import { optionCard, wireRadioGroup } from '../ui/option-card.js'
import { showToast } from '../ui/toast.js'
import { logger } from '../lib/logger.js'
import { reactiveBlock, section, stepShell } from './step-shell.js'

/**
 * Render the exported paths as an indented tree (SPEC 37).
 * @param {string} root
 * @param {ReadonlyArray<import('../agent/files.js').ExportFile>} files
 * @returns {HTMLElement}
 */
function structureTree(root, files) {
  /** @type {Map<string, string[]>} */
  const folders = new Map()
  /** @type {string[]} */
  const topLevel = []

  for (const file of files) {
    const parts = file.path.split('/')
    if (parts.length === 1) {
      topLevel.push(parts[0])
    } else {
      const folder = parts.slice(0, -1).join('/')
      const existing = folders.get(folder) ?? []
      existing.push(parts[parts.length - 1])
      folders.set(folder, existing)
    }
  }

  return h(
    'div',
    { class: 'tree' },
    h('div', { class: 'tree__root' }, icon('folder', { size: 15 }), `${root}/`),
    h(
      'ul',
      { class: 'tree__list' },
      ...topLevel.map((name) =>
        h('li', { class: 'tree__file' }, icon('file-text', { size: 14 }), name)
      ),
      ...Array.from(folders.entries()).map(([folder, children]) =>
        h(
          'li',
          { class: 'tree__folder' },
          h('span', { class: 'tree__folder-name' }, icon('folder', { size: 14 }), `${folder}/`),
          h(
            'ul',
            { class: 'tree__list' },
            ...children.map((name) =>
              h('li', { class: 'tree__file' }, icon('file-text', { size: 14 }), name)
            )
          )
        )
      )
    )
  )
}

/** @returns {import('./step-shell.js').StepView} */
export function exportStep() {
  /** @type {import('../agent/presets.js').PresetId} */
  let preset = DEFAULT_PRESET

  const presetGroup = h('div', { class: 'preset-families' })
  const structure = h('div', { class: 'export__structure' })

  /*
   * One radiogroup per family, not one for all six: the families answer
   * different questions, and arrow-key navigation that wraps across all of them
   * would suggest they are variations of the same choice.
   */
  const renderPresets = () => {
    setChildren(
      presetGroup,
      ...PRESET_FAMILIES.map((family) => {
        const list = h(
          'div',
          { class: 'card-list', 'aria-label': family.label },
          ...presetsInFamily(family.id).map((definition) =>
            optionCard({
              role: 'radio',
              layout: 'row',
              label: definition.label,
              description: definition.description,
              iconName: definition.icon,
              selected: definition.id === preset,
              onToggle: () => {
                preset = definition.id
                renderPresets()
                renderStructure()
                refreshActions()
              },
            })
          )
        )
        wireRadioGroup(list)

        return h(
          'div',
          { class: 'preset-family' },
          h(
            'div',
            { class: 'preset-family__header' },
            h('h3', { class: 'preset-family__title' }, family.label),
            h('p', { class: 'preset-family__description helper' }, family.description)
          ),
          list
        )
      })
    )
  }

  const renderStructure = () => {
    const agent = builderStore.getState().agent
    const files = buildFileTree(agent, preset)
    const root = exportRootName(agent, preset)

    setChildren(
      structure,
      // A prompt and the single Markdown are both one file: a tree with one
      // branch would be theatre.
      files.length === 1
        ? h(
            'div',
            { class: 'tree' },
            h(
              'div',
              { class: 'tree__file tree__file--single' },
              icon('file-text', { size: 15 }),
              files[0].path
            )
          )
        : structureTree(root, files),
      h(
        'p',
        { class: 'helper' },
        files.length === 1
          ? 'Um arquivo, pronto para copiar ou baixar.'
          : `${files.length} arquivos serão gerados.`
      )
    )
  }

  /**
   * @param {HTMLElement} container
   * @returns {void}
   */
  const renderActions = (container) => {
    {
      const agent = builderStore.getState().agent
      const blockers = getExportBlockers(agent)

      /**
       * The save file, offered whatever else is missing.
       *
       * The gate below exists because documentation for a nameless agent is
       * useless. A half-filled state is not: it is exactly what someone wants
       * to carry to another browser, or hand to a colleague to finish.
       *
       * @returns {HTMLElement}
       */
      const stateExport = () =>
        h(
          'div',
          { class: 'export-state' },
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn-secondary',
              onclick: () => {
                downloadAgentJson(builderStore.getState().agent)
                showToast({ message: 'JSON do agente baixado.', variant: 'success' })
              },
            },
            icon('hard-drive', { size: 15 }),
            'Baixar JSON do agente'
          ),
          h(
            'p',
            { class: 'helper' },
            'Guarda todas as etapas como estão. Ao criar um novo agente, este arquivo pode ser importado de volta.'
          )
        )

      if (blockers.length > 0) {
        setChildren(
          container,
          h(
            'div',
            { class: 'export-gate' },
            h(
              'p',
              { class: 'export-gate__title' },
              icon('alert-circle', { size: 16 }),
              'Falta pouco para exportar'
            ),
            h(
              'ul',
              { class: 'export-gate__list' },
              ...blockers.map((blocker) =>
                h(
                  'li',
                  null,
                  blocker.message,
                  ' ',
                  h(
                    'button',
                    {
                      type: 'button',
                      class: 'link-button',
                      onclick: () => setStep(blocker.step),
                    },
                    'Resolver'
                  )
                )
              )
            )
          ),
          stateExport()
        )
        return
      }

      /**
       * @param {string} label
       * @param {string} iconName
       * @param {() => void | Promise<void>} onClick
       * @param {boolean} [primary]
       */
      const action = (label, iconName, onClick, primary = false) =>
        h(
          'button',
          {
            type: 'button',
            class: `btn ${primary ? 'btn-primary' : 'btn-secondary'}`,
            onclick: onClick,
          },
          icon(/** @type {any} */ (iconName), { size: 15 }),
          label
        )

      /*
       * The actions follow the chosen family. A ZIP of a single prompt would be
       * an insult, and "Copiar prompt" is the whole point of that family, so
       * each one leads with the action someone actually came for.
       */
      const definition = getPreset(preset)
      const target = definition.promptTarget

      /** @type {HTMLElement[]} */
      const buttons = []

      if (target) {
        buttons.push(
          action(
            'Copiar prompt',
            'copy',
            async () => {
              const ok = await copyCreationPrompt(builderStore.getState().agent, target)
              showToast({
                message: ok ? 'Prompt copiado. Cole na ferramenta.' : 'Não foi possível copiar.',
                variant: ok ? 'success' : 'error',
              })
            },
            true
          ),
          action('Baixar prompt', 'download', () => {
            downloadCreationPrompt(builderStore.getState().agent, target)
            showToast({ message: 'Arquivo baixado.', variant: 'success' })
          })
        )
      } else if (definition.family === 'doc') {
        buttons.push(
          action(
            'Copiar Markdown',
            'copy',
            async () => {
              const ok = await copyAgentMarkdown(builderStore.getState().agent)
              showToast({
                message: ok ? 'Markdown copiado.' : 'Não foi possível copiar.',
                variant: ok ? 'success' : 'error',
              })
            },
            true
          ),
          action('Baixar AGENT.md', 'download', () => {
            downloadAgentMarkdown(builderStore.getState().agent)
            showToast({ message: 'Arquivo baixado.', variant: 'success' })
          })
        )
      } else {
        buttons.push(
          action(
            'Baixar ZIP',
            'package',
            async () => {
              try {
                await downloadAgentZip(builderStore.getState().agent, preset)
                showToast({ message: 'Estrutura exportada.', variant: 'success' })
              } catch (error) {
                logger.error('ZIP generation failed', error)
                showToast({
                  message: 'Não foi possível gerar o arquivo. Tente novamente.',
                  variant: 'error',
                })
              }
            },
            true
          ),
          action('Copiar Markdown', 'copy', async () => {
            const ok = await copyAgentMarkdown(builderStore.getState().agent)
            showToast({
              message: ok ? 'Markdown copiado.' : 'Não foi possível copiar.',
              variant: ok ? 'success' : 'error',
            })
          }),
          action('Baixar Markdown', 'download', () => {
            downloadAgentMarkdown(builderStore.getState().agent)
            showToast({ message: 'Arquivo baixado.', variant: 'success' })
          }),
          action('Baixar config.json', 'file-text', () => {
            downloadConfigJson(builderStore.getState().agent)
            showToast({ message: 'Arquivo baixado.', variant: 'success' })
          })
        )
      }

      setChildren(
        container,
        target
          ? h('p', { class: 'export-hint helper' }, getPromptTarget(target)?.where ?? '')
          : null,
        h('div', { class: 'export-actions' }, ...buttons),
        stateExport()
      )
    }
  }

  const actions = reactiveBlock(
    (state) => ({
      name: state.agent.name.trim(),
      objective: state.agent.objective.trim(),
    }),
    renderActions
  )

  // Hoisted on purpose: the preset cards are built before `actions` exists, and
  // their handlers only run long after both are in place.
  function refreshActions() {
    renderActions(actions.element)
  }

  renderPresets()
  renderStructure()

  const unsubscribeStructure = builderStore.select((state) => state.agent, renderStructure)

  const element = stepShell(
    'export',
    section({ title: 'Formato', emoji: '📦' }, presetGroup),
    section({ title: 'O que será gerado', emoji: '🗂️' }, structure),
    section({ title: 'Exportar', emoji: '⬇️' }, actions.element)
  )

  return {
    element,
    destroy: () => {
      actions.destroy()
      unsubscribeStructure()
    },
  }
}
