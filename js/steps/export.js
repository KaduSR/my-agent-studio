// @ts-check
/** Step 8 — Exportar (SPEC 36, 37, 39, 40, 50). */

import { h, setChildren } from '../lib/dom.js'
import { icon } from '../icons.js'
import { PRESETS, DEFAULT_PRESET } from '../agent/presets.js'
import { buildFileTree, exportRootName } from '../agent/files.js'
import { getExportBlockers } from '../agent/validate.js'
import {
  copyAgentMarkdown,
  downloadAgentMarkdown,
  downloadAgentZip,
  downloadConfigJson,
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

  const presetGroup = h('div', { class: 'card-list', 'aria-label': 'Formato de exportação' })
  const structure = h('div', { class: 'export__structure' })

  const renderPresets = () => {
    setChildren(
      presetGroup,
      ...PRESETS.map((definition) =>
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
          },
        })
      )
    )
    wireRadioGroup(presetGroup)
  }

  const renderStructure = () => {
    const agent = builderStore.getState().agent
    const files = buildFileTree(agent, preset)
    const root = exportRootName(agent, preset)

    setChildren(
      structure,
      preset === 'markdown'
        ? h(
            'div',
            { class: 'tree' },
            h('div', { class: 'tree__file tree__file--single' }, icon('file-text', { size: 15 }), 'AGENT.md')
          )
        : structureTree(root, files),
      h(
        'p',
        { class: 'helper' },
        `${files.length} arquivo${files.length === 1 ? '' : 's'} serão gerados.`
      )
    )
  }

  const actions = reactiveBlock(
    (state) => ({
      name: state.agent.name.trim(),
      objective: state.agent.objective.trim(),
    }),
    (container) => {
      const agent = builderStore.getState().agent
      const blockers = getExportBlockers(agent)

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
          )
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

      setChildren(
        container,
        h(
          'div',
          { class: 'export-actions' },
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
      )
    }
  )

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
