// @ts-check
/**
 * Reorderable hard-rules list (SPEC 27, ADR-009 without dnd-kit).
 *
 * Two independent ways to reorder, because a drag that only works with a mouse
 * fails SPEC 65:
 *
 *  - Pointer: the row follows the cursor and its neighbours slide out of the
 *    way. Nothing is committed until pointerup, so the list is never rebuilt
 *    mid-drag.
 *  - Keyboard: focus a handle, press Space to pick the rule up, move it with
 *    the arrow keys, press Space to drop or Escape to put it back. Every step
 *    is announced through the live region.
 *
 * The list only rebuilds when its *structure* changes. Editing a rule's text
 * must not re-render, or the caret would jump on every keystroke.
 */

import { h, on, setChildren } from '../lib/dom.js'
import { icon } from '../icons.js'
import { LIMITS } from '../agent/validate.js'
import {
  builderStore,
  moveRule,
  removeRule,
  undoRemoveRule,
  updateRuleText,
} from '../stores/builder-store.js'
import { announce, showToast } from '../ui/toast.js'

/** @returns {import('../agent/types.js').AgentRule[]} */
function orderedRules() {
  return [...builderStore.getState().agent.hardRules].sort((a, b) => a.order - b.order)
}

/** @returns {{ element: HTMLElement, destroy: () => void }} */
export function sortableRules() {
  const list = h('ul', { class: 'rules' })

  /** Index currently held by the keyboard, or null. */
  let grabbedIndex = /** @type {number | null} */ (null)
  /** Where the keyboard grab started, so Escape can undo it. */
  let grabOrigin = /** @type {number | null} */ (null)

  /** @param {number} index */
  const focusHandle = (index) => {
    const handles = list.querySelectorAll('.rule__handle')
    const handle = handles[index]
    if (handle instanceof HTMLElement) handle.focus()
  }

  /**
   * @param {number} from
   * @param {number} to
   */
  const commitMove = (from, to) => {
    const total = orderedRules().length
    if (to < 0 || to >= total || from === to) return
    grabbedIndex = to
    // The store notifies synchronously, so the list has already been rebuilt by
    // the time this returns — and the focused handle was destroyed with it.
    moveRule(from, to)
    announce(`Regra movida para a posição ${to + 1} de ${total}.`)
    focusHandle(to)
  }

  /* ------------------------------- pointer ------------------------------- */

  /**
   * @param {PointerEvent} event
   * @param {number} fromIndex
   */
  function startPointerDrag(event, fromIndex) {
    const items = /** @type {HTMLElement[]} */ (Array.from(list.children))
    if (items.length < 2) return

    const handle = /** @type {HTMLElement} */ (event.currentTarget)
    const rects = items.map((item) => item.getBoundingClientRect())
    const dragged = items[fromIndex]
    const startY = event.clientY
    let target = fromIndex

    handle.setPointerCapture(event.pointerId)
    dragged.dataset.dragging = 'true'
    list.dataset.dragging = 'true'

    /** @param {PointerEvent} moveEvent */
    const onMove = (moveEvent) => {
      const dy = moveEvent.clientY - startY
      dragged.style.transform = `translateY(${dy}px)`

      const center = rects[fromIndex].top + rects[fromIndex].height / 2 + dy
      let next = fromIndex
      for (let i = 0; i < rects.length; i += 1) {
        if (i === fromIndex) continue
        const otherCenter = rects[i].top + rects[i].height / 2
        if (i < fromIndex && center < otherCenter) next = Math.min(next, i)
        if (i > fromIndex && center > otherCenter) next = Math.max(next, i)
      }

      if (next !== target) target = next

      // Slide the displaced neighbours to preview the drop position.
      const height = rects[fromIndex].height
      items.forEach((item, i) => {
        if (i === fromIndex) return
        let shift = 0
        if (fromIndex < target && i > fromIndex && i <= target) shift = -height
        else if (fromIndex > target && i < fromIndex && i >= target) shift = height
        item.style.transform = shift === 0 ? '' : `translateY(${shift}px)`
      })
    }

    const onEnd = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onEnd)
      document.removeEventListener('pointercancel', onEnd)

      items.forEach((item) => {
        item.style.transform = ''
        delete item.dataset.dragging
      })
      delete list.dataset.dragging

      if (target !== fromIndex) {
        moveRule(fromIndex, target)
        announce(`Regra movida para a posição ${target + 1} de ${items.length}.`)
      }
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onEnd)
    document.addEventListener('pointercancel', onEnd)
  }

  /* ------------------------------- keyboard ------------------------------ */

  /**
   * @param {KeyboardEvent} event
   * @param {number} index
   */
  function onHandleKeyDown(event, index) {
    const total = orderedRules().length

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      if (grabbedIndex === null) {
        grabbedIndex = index
        grabOrigin = index
        list.dataset.grabbing = 'true'
        announce(
          `Regra ${index + 1} de ${total} selecionada para mover. Use as setas para cima e para baixo, Espaço para soltar, Escape para cancelar.`
        )
        render()
        focusHandle(index)
        return
      }

      const dropped = grabbedIndex
      grabbedIndex = null
      grabOrigin = null
      delete list.dataset.grabbing
      announce(`Regra solta na posição ${dropped + 1} de ${total}.`)
      render()
      focusHandle(dropped)
      return
    }

    if (grabbedIndex === null) return

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      commitMove(grabbedIndex, grabbedIndex - 1)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      commitMove(grabbedIndex, grabbedIndex + 1)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      if (grabOrigin !== null && grabbedIndex !== grabOrigin) {
        moveRule(grabbedIndex, grabOrigin)
      }
      const origin = grabOrigin ?? index
      grabbedIndex = null
      grabOrigin = null
      delete list.dataset.grabbing
      announce('Movimentação cancelada.')
      render()
      focusHandle(origin)
    }
  }

  /* -------------------------------- render ------------------------------- */

  /** Guards against focusout re-entering render while the list is being rebuilt. */
  let rendering = false

  function render() {
    const rules = orderedRules()
    rendering = true

    setChildren(
      list,
      ...rules.map((rule, index) =>
        h(
          'li',
          {
            class: 'rule',
            dataset: { id: rule.id, grabbed: String(grabbedIndex === index) },
          },
          h(
            'button',
            {
              type: 'button',
              class: 'rule__handle',
              'aria-label': `Reordenar regra ${index + 1}: ${rule.text}`,
              'aria-pressed': String(grabbedIndex === index),
              onpointerdown: (/** @type {PointerEvent} */ event) => {
                if (event.button !== 0) return
                event.preventDefault()
                startPointerDrag(event, index)
              },
              onkeydown: (/** @type {KeyboardEvent} */ event) => onHandleKeyDown(event, index),
            },
            icon('grip-vertical', { size: 16 })
          ),
          h('span', { class: 'rule__number', 'aria-hidden': 'true' }, String(index + 1)),
          h('input', {
            type: 'text',
            class: 'rule__input',
            value: rule.text,
            maxlength: String(LIMITS.ruleMax),
            'aria-label': `Regra ${index + 1}`,
            oninput: (/** @type {Event} */ event) => {
              const input = /** @type {HTMLInputElement} */ (event.target)
              updateRuleText(rule.id, input.value)
            },
          }),
          h(
            'button',
            {
              type: 'button',
              class: 'rule__delete',
              'aria-label': `Remover regra ${index + 1}`,
              onclick: () => {
                removeRule(rule.id)
                showToast({
                  message: 'Regra removida',
                  action: { label: 'Desfazer', onAction: () => undoRemoveRule() },
                })
              },
            },
            icon('trash-2', { size: 15 })
          )
        )
      )
    )

    rendering = false
  }

  render()

  // Structure only: ids and their order. Text edits deliberately do not
  // re-render, so the caret stays where the user put it.
  const unsubscribe = builderStore.select(
    (state) =>
      [...state.agent.hardRules]
        .sort((a, b) => a.order - b.order)
        .map((rule) => rule.id)
        .join('|'),
    render
  )

  const help = h(
    'p',
    { class: 'helper rules__help' },
    'Arraste pela alça para reordenar, ou use o teclado: Espaço para pegar, setas para mover, Espaço para soltar.'
  )

  const element = h('div', { class: 'rules-editor' }, list, help)

  /*
   * Dropping a keyboard grab when focus leaves avoids a stuck state — but every
   * reorder rebuilds the list, so focus legitimately leaves for an instant on
   * the way to the new handle. The check is therefore deferred and re-verified
   * against the *settled* activeElement, and suppressed outright while a render
   * is in flight (re-entering render mid-teardown detaches nodes twice).
   */
  on(element, 'focusout', () => {
    if (grabbedIndex === null || rendering) return
    setTimeout(() => {
      if (grabbedIndex === null) return
      if (element.contains(document.activeElement)) return
      grabbedIndex = null
      grabOrigin = null
      delete list.dataset.grabbing
      render()
    }, 0)
  })

  return { element, destroy: unsubscribe }
}
