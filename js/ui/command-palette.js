// @ts-check
/**
 * Command palette (SPEC 91, SPEC 83).
 *
 * SPEC 91 gives a binary choice: make the search field real, or remove it.
 * This makes it real — it searches the eight builder steps and every saved
 * agent, and activating a result actually navigates there.
 *
 * Built on <dialog> for the focus trap, with aria-activedescendant so the
 * listbox selection is announced while focus stays in the text field.
 */

import { h, on, setChildren } from '../lib/dom.js'
import { icon } from '../icons.js'
import { STEPS } from '../data/steps.js'
import { TEMPLATES } from '../data/templates.js'
import { listAgents } from '../stores/library-store.js'
import { navigate } from '../router.js'
import { setStep } from '../stores/builder-store.js'
import { currentRoute } from '../router.js'

/**
 * @typedef {Object} PaletteItem
 * @property {string} id
 * @property {string} group
 * @property {string} label
 * @property {string} [hint]
 * @property {string} icon
 * @property {() => void} run
 */

/**
 * Normalise for accent-insensitive matching, so "memoria" finds "Memória".
 * @param {string} value
 * @returns {string}
 */
function fold(value) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/**
 * @returns {PaletteItem[]}
 */
function buildItems() {
  const route = currentRoute()
  const inBuilder = route.name === 'new' || route.name === 'edit'

  /** @type {PaletteItem[]} */
  const items = STEPS.map((step) => ({
    id: `step:${step.id}`,
    group: 'Etapas',
    label: `${step.index}. ${step.label}`,
    hint: step.hint,
    icon: step.icon,
    run: () => {
      if (inBuilder) {
        setStep(step.id)
      } else {
        navigate('/studio/new')
        // The builder mounts on the next tick; select the step once it exists.
        requestAnimationFrame(() => setStep(step.id))
      }
    },
  }))

  for (const template of TEMPLATES) {
    items.push({
      id: `template:${template.id}`,
      group: 'Modelos',
      label: template.label,
      hint: template.tagline,
      icon: 'sparkles',
      run: () => navigate(`/studio/new/${template.id}`),
    })
  }

  for (const agent of listAgents()) {
    items.push({
      id: `agent:${agent.id}`,
      group: 'Meus agentes',
      label: agent.name || 'Agente sem nome',
      hint: agent.objective.slice(0, 80),
      icon: 'user-round',
      run: () => navigate(`/studio/${agent.id}`),
    })
  }

  items.push({
    id: 'nav:library',
    group: 'Ir para',
    label: 'Meus agentes',
    hint: 'Ver todos os agentes salvos',
    icon: 'folder',
    run: () => navigate('/studio'),
  })
  items.push({
    id: 'nav:new',
    group: 'Ir para',
    label: 'Criar novo agente',
    hint: 'Começar do zero',
    icon: 'plus',
    run: () => navigate('/studio/new'),
  })

  return items
}

let open = false

/** @returns {void} */
export function openCommandPalette() {
  if (open) return
  open = true

  const allItems = buildItems()
  /** @type {PaletteItem[]} */
  let visible = allItems
  let activeIndex = 0

  const list = h('ul', { class: 'palette__list', role: 'listbox', id: 'palette-listbox' })
  const empty = h('p', { class: 'palette__empty helper' }, 'Nada encontrado.')

  const input = h('input', {
    type: 'text',
    class: 'palette__input',
    placeholder: 'Buscar no estúdio...',
    'aria-label': 'Buscar no estúdio',
    role: 'combobox',
    'aria-expanded': 'true',
    'aria-controls': 'palette-listbox',
    'aria-autocomplete': 'list',
    autocomplete: 'off',
  })

  const dialog = h(
    'dialog',
    { class: 'palette' },
    h(
      'div',
      { class: 'palette__header' },
      icon('search', { size: 16 }),
      input,
      h('kbd', { class: 'palette__kbd' }, 'Esc')
    ),
    h('div', { class: 'palette__results' }, list, empty)
  )

  const close = () => {
    open = false
    dialog.close()
  }

  const render = () => {
    setChildren(list)
    empty.hidden = visible.length > 0

    let group = ''
    visible.forEach((item, index) => {
      if (item.group !== group) {
        group = item.group
        list.appendChild(h('li', { class: 'palette__group', role: 'presentation' }, group))
      }

      const option = h(
        'li',
        {
          class: 'palette__item',
          role: 'option',
          id: `palette-option-${index}`,
          'aria-selected': String(index === activeIndex),
          onclick: () => {
            close()
            item.run()
          },
          onpointermove: () => {
            if (activeIndex === index) return
            activeIndex = index
            render()
          },
        },
        h('span', { class: 'palette__item-icon' }, icon(/** @type {any} */ (item.icon), { size: 15 })),
        h(
          'span',
          { class: 'palette__item-text' },
          h('span', { class: 'palette__item-label' }, item.label),
          item.hint ? h('span', { class: 'palette__item-hint' }, item.hint) : null
        )
      )
      list.appendChild(option)
    })

    input.setAttribute(
      'aria-activedescendant',
      visible.length > 0 ? `palette-option-${activeIndex}` : ''
    )
    const active = list.querySelector('[aria-selected="true"]')
    if (active) active.scrollIntoView({ block: 'nearest' })
  }

  on(input, 'input', () => {
    const query = fold(input.value.trim())
    visible = query
      ? allItems.filter(
          (item) => fold(item.label).includes(query) || fold(item.hint ?? '').includes(query)
        )
      : allItems
    activeIndex = 0
    render()
  })

  on(dialog, 'keydown', (event) => {
    const key = /** @type {KeyboardEvent} */ (event).key
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault()
      if (visible.length === 0) return
      const delta = key === 'ArrowDown' ? 1 : -1
      activeIndex = (activeIndex + delta + visible.length) % visible.length
      render()
    } else if (key === 'Enter') {
      event.preventDefault()
      const item = visible[activeIndex]
      if (!item) return
      close()
      item.run()
    }
  })

  on(dialog, 'click', (event) => {
    if (event.target === dialog) close()
  })

  dialog.addEventListener('close', () => {
    open = false
    dialog.remove()
  })

  document.body.appendChild(dialog)
  render()
  dialog.showModal()
  input.focus()
}

/**
 * Bind the global shortcut (SPEC 83). Native shortcuts stay untouched.
 * @returns {void}
 */
export function registerPaletteShortcut() {
  on(document, 'keydown', (event) => {
    const keyboardEvent = /** @type {KeyboardEvent} */ (event)
    if (keyboardEvent.key.toLowerCase() !== 'k') return
    if (!keyboardEvent.metaKey && !keyboardEvent.ctrlKey) return
    keyboardEvent.preventDefault()
    openCommandPalette()
  })
}
