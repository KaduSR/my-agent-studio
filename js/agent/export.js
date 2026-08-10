// @ts-check
/**
 * Export actions (ADR-011, SPEC 36, 53).
 *
 * Everything here is derived on demand from the Agent — nothing is cached, so
 * what gets copied or downloaded always matches what the preview shows.
 */

import { createZip } from '../lib/zip.js'
import { slugify } from '../lib/uuid.js'
import { logger } from '../lib/logger.js'
import { trackEvent } from '../lib/analytics.js'
import { generateAgentMarkdown } from './markdown.js'
import { buildFileTree, exportRootName, generateConfigJson } from './files.js'

/**
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (error) {
    logger.warn('Clipboard API refused the write; falling back', error)
  }

  // Fallback for non-secure origins, where navigator.clipboard is undefined.
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch (error) {
    logger.error('Could not copy to the clipboard', error)
    return false
  }
}

/**
 * @param {string} filename
 * @param {BlobPart} content
 * @param {string} mime
 * @returns {void}
 */
export function downloadBlob(filename, content, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Revoke on the next frame so the navigation has certainly started.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * @param {import('./types.js').Agent} agent
 * @returns {Promise<boolean>}
 */
export async function copyAgentMarkdown(agent) {
  const ok = await copyText(generateAgentMarkdown(agent))
  if (ok) trackEvent('markdown_copied', { agentId: agent.id })
  return ok
}

/**
 * @param {import('./types.js').Agent} agent
 * @returns {void}
 */
export function downloadAgentMarkdown(agent) {
  downloadBlob(`${slugify(agent.name)}.md`, generateAgentMarkdown(agent), 'text/markdown;charset=utf-8')
  trackEvent('agent_exported', { agentId: agent.id, format: 'markdown' })
}

/**
 * @param {import('./types.js').Agent} agent
 * @returns {void}
 */
export function downloadConfigJson(agent) {
  downloadBlob(`${slugify(agent.name)}.config.json`, generateConfigJson(agent), 'application/json;charset=utf-8')
  trackEvent('agent_exported', { agentId: agent.id, format: 'json' })
}

/**
 * @param {import('./types.js').Agent} agent
 * @param {import('./presets.js').PresetId} presetId
 * @returns {void}
 */
export function downloadSingleFile(agent, presetId) {
  const files = buildFileTree(agent, presetId)
  for (const file of files) {
    const name = file.path.split('/').pop() ?? file.path
    downloadBlob(name, file.content, 'text/markdown;charset=utf-8')
  }
}

/**
 * Package the full preset structure as a ZIP (SPEC 36, 37, 40).
 * @param {import('./types.js').Agent} agent
 * @param {import('./presets.js').PresetId} presetId
 * @returns {Promise<void>}
 */
export async function downloadAgentZip(agent, presetId) {
  const root = exportRootName(agent, presetId)
  const files = buildFileTree(agent, presetId)

  const bytes = await createZip(
    files.map((file) => ({ path: `${root}/${file.path}`, content: file.content }))
  )

  downloadBlob(`${root}.zip`, bytes, 'application/zip')
  trackEvent('zip_exported', { agentId: agent.id, preset: presetId, files: files.length })
}
