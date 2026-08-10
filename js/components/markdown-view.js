// @ts-check
/**
 * Read-only Markdown viewer with syntax colouring (SPEC 34).
 *
 * The tokenizer emits DOM nodes, not an HTML string. That is the whole point:
 * SPEC 67 forbids putting user content through the HTML parser, and an agent's
 * objective or hard rules are user content. A `#` in a rule renders as a `#`.
 *
 * Only the constructs the generator actually emits are highlighted — headings,
 * list markers, blockquotes, bold spans and inline code. Anything else is
 * rendered as plain text rather than guessed at.
 */

import { h } from '../lib/dom.js'

/** Inline `code` and **bold** runs. */
const INLINE_PATTERN = /(`[^`]+`|\*\*[^*]+\*\*)/g

/**
 * @param {string} text
 * @returns {(HTMLElement | string)[]}
 */
function inlineNodes(text) {
  /** @type {(HTMLElement | string)[]} */
  const nodes = []
  let lastIndex = 0

  for (const match of text.matchAll(INLINE_PATTERN)) {
    const index = match.index ?? 0
    if (index > lastIndex) nodes.push(text.slice(lastIndex, index))

    const token = match[0]
    if (token.startsWith('`')) {
      nodes.push(h('span', { class: 'md-code' }, token))
    } else {
      nodes.push(h('span', { class: 'md-strong' }, token))
    }
    lastIndex = index + token.length
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

/**
 * Render one source line as a coloured element.
 * @param {string} line
 * @returns {HTMLElement}
 */
export function renderMarkdownLine(line) {
  const heading = /^(#{1,6})\s+(.*)$/.exec(line)
  if (heading) {
    return h(
      'span',
      { class: `md-line md-heading md-heading--${heading[1].length}` },
      h('span', { class: 'md-marker' }, `${heading[1]} `),
      h('span', { class: 'md-heading-text' }, heading[2])
    )
  }

  const bullet = /^(\s*)(-\s)(.*)$/.exec(line)
  if (bullet) {
    return h(
      'span',
      { class: 'md-line' },
      bullet[1],
      h('span', { class: 'md-marker' }, bullet[2]),
      ...inlineNodes(bullet[3])
    )
  }

  const ordered = /^(\s*)(\d+\.\s)(.*)$/.exec(line)
  if (ordered) {
    return h(
      'span',
      { class: 'md-line' },
      ordered[1],
      h('span', { class: 'md-marker' }, ordered[2]),
      ...inlineNodes(ordered[3])
    )
  }

  const quote = /^(>\s?)(.*)$/.exec(line)
  if (quote) {
    return h(
      'span',
      { class: 'md-line md-quote' },
      h('span', { class: 'md-marker' }, quote[1]),
      ...inlineNodes(quote[2])
    )
  }

  if (line.trim() === '') return h('span', { class: 'md-line' }, ' ')

  return h('span', { class: 'md-line' }, ...inlineNodes(line))
}

/**
 * Build the full viewer body: a gutter of line numbers beside the code.
 * @param {string} markdown
 * @returns {DocumentFragment}
 */
export function renderMarkdown(markdown) {
  const lines = markdown.replace(/\n$/, '').split('\n')
  const fragment = document.createDocumentFragment()

  const gutter = h('div', { class: 'md-gutter', 'aria-hidden': 'true' })
  const code = h('code', { class: 'md-code-body' })

  lines.forEach((line, index) => {
    gutter.appendChild(h('span', { class: 'md-gutter__number' }, String(index + 1)))
    // Each line is a block element, so it already breaks. Appending a literal
    // "\n" as well would double the spacing inside `white-space: pre`.
    code.appendChild(renderMarkdownLine(line))
  })

  fragment.appendChild(gutter)
  fragment.appendChild(h('pre', { class: 'md-pre' }, code))
  return fragment
}
