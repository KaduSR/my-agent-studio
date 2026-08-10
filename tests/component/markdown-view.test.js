// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { renderMarkdown, renderMarkdownLine } from '../../js/components/markdown-view.js'
import { generateAgentMarkdown } from '../../js/agent/markdown.js'
import { createEmptyAgent } from '../../js/agent/defaults.js'

describe('renderMarkdownLine', () => {
  it('classifies headings by level', () => {
    expect(renderMarkdownLine('# Título').className).toContain('md-heading--1')
    expect(renderMarkdownLine('### Sub').className).toContain('md-heading--3')
    expect(renderMarkdownLine('# Título').textContent).toBe('# Título')
  })

  it('marks bullets, ordered items and quotes', () => {
    expect(renderMarkdownLine('- item').querySelector('.md-marker')?.textContent).toBe('- ')
    expect(renderMarkdownLine('1. item').querySelector('.md-marker')?.textContent).toBe('1. ')
    expect(renderMarkdownLine('> citação').className).toContain('md-quote')
  })

  it('highlights inline code and bold runs', () => {
    const line = renderMarkdownLine('use **isto** e `aquilo`')
    expect(line.querySelector('.md-strong')?.textContent).toBe('**isto**')
    expect(line.querySelector('.md-code')?.textContent).toBe('`aquilo`')
    expect(line.textContent).toBe('use **isto** e `aquilo`')
  })

  it('preserves leading indentation of nested bullets', () => {
    expect(renderMarkdownLine('  - aninhado').textContent).toBe('  - aninhado')
  })
})

describe('renderMarkdown', () => {
  it('emits one gutter number per source line', () => {
    const host = document.createElement('div')
    host.appendChild(renderMarkdown('a\nb\nc\n'))

    expect(host.querySelectorAll('.md-gutter__number')).toHaveLength(3)
    expect(host.querySelectorAll('.md-line')).toHaveLength(3)
    expect(host.querySelector('.md-gutter__number')?.textContent).toBe('1')
  })

  it('keeps gutter and code in step for a real document', () => {
    const markdown = generateAgentMarkdown(createEmptyAgent({ name: 'X', objective: 'Y' }))
    const host = document.createElement('div')
    host.appendChild(renderMarkdown(markdown))

    // One row each: any mismatch means the line numbers point at the wrong line.
    expect(host.querySelectorAll('.md-gutter__number').length).toBe(
      host.querySelectorAll('.md-line').length
    )
  })

  it('renders blank lines as their own row', () => {
    const host = document.createElement('div')
    host.appendChild(renderMarkdown('a\n\nb'))
    expect(host.querySelectorAll('.md-line')).toHaveLength(3)
  })
})

describe('security (SPEC 67)', () => {
  it('renders markup in user content as literal text', () => {
    const agent = createEmptyAgent({
      name: '<img src=x onerror=alert(1)>',
      objective: '<script>alert("xss")</script>',
      hardRules: [{ id: '1', text: '<iframe src="evil"></iframe>', order: 0 }],
    })

    const host = document.createElement('div')
    host.appendChild(renderMarkdown(generateAgentMarkdown(agent)))

    // Nothing became a node; it all stayed text.
    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('script')).toBeNull()
    expect(host.querySelector('iframe')).toBeNull()
    expect(host.textContent).toContain('<img src=x onerror=alert(1)>')
    expect(host.textContent).toContain('<script>alert("xss")</script>')
  })
})
