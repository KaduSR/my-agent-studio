// @ts-check
/**
 * The three-column builder (SPEC 12, 55, 64).
 *
 * Desktop shows sidebar / content / preview side by side. Below 1024px the
 * preview becomes a tab, so the same DOM serves every breakpoint and there is
 * no second implementation to keep in sync.
 */

import { h, setChildren } from '../lib/dom.js'
import { icon } from '../icons.js'
import { builderStore } from '../stores/builder-store.js'
import { builderSidebar } from '../components/builder-sidebar.js'
import { previewPanel } from '../components/preview-panel.js'
import { renderStep } from '../steps/index.js'

/** @returns {{ element: HTMLElement, destroy: () => void }} */
export function builderView() {
  const sidebar = builderSidebar({
    onCollapsedChange: (collapsed) => {
      shell.dataset.sidebar = collapsed ? 'collapsed' : 'expanded'
    },
  })
  const preview = previewPanel({
    onCollapsedChange: (collapsed) => {
      // The shell owns the grid, so it needs to know how wide the third
      // column should be.
      shell.dataset.preview = collapsed ? 'collapsed' : 'expanded'
    },
  })

  const content = h('main', { class: 'builder__content', id: 'main', tabindex: '-1' })

  /** @type {import('../steps/step-shell.js').StepView | null} */
  let currentStep = null

  const renderCurrentStep = () => {
    currentStep?.destroy?.()
    currentStep = renderStep(builderStore.getState().step)
    setChildren(content, currentStep.element)
    // Return the reading position to the top when the step changes.
    content.scrollTo({ top: 0 })
  }

  renderCurrentStep()
  const unsubscribeStep = builderStore.select((state) => state.step, renderCurrentStep)

  /** @type {'builder' | 'preview'} */
  let mobileTab = 'builder'

  const shell = h(
    'div',
    {
      class: 'builder',
      dataset: {
        tab: mobileTab,
        sidebar: sidebar.isCollapsed() ? 'collapsed' : 'expanded',
        preview: preview.isCollapsed() ? 'collapsed' : 'expanded',
      },
    },
    sidebar.element,
    content,
    preview.element
  )

  /**
   * @param {'builder' | 'preview'} tab
   * @param {string} label
   * @param {string} iconName
   */
  const tabButton = (tab, label, iconName) =>
    h(
      'button',
      {
        type: 'button',
        class: 'mobile-tab',
        role: 'tab',
        'aria-selected': String(mobileTab === tab),
        onclick: () => {
          mobileTab = tab
          shell.dataset.tab = tab
          for (const button of tabs.querySelectorAll('[role="tab"]')) {
            button.setAttribute(
              'aria-selected',
              String(button.getAttribute('data-tab') === tab)
            )
          }
        },
        dataset: { tab },
      },
      icon(/** @type {any} */ (iconName), { size: 15 }),
      label
    )

  const tabs = h(
    'div',
    { class: 'mobile-tabs', role: 'tablist', 'aria-label': 'Alternar entre construtor e pré-visualização' },
    tabButton('builder', 'Construtor', 'wrench'),
    tabButton('preview', 'Preview', 'eye')
  )

  const element = h('div', { class: 'builder-view' }, tabs, shell)

  return {
    element,
    destroy: () => {
      currentStep?.destroy?.()
      unsubscribeStep()
      sidebar.destroy()
      preview.destroy()
    },
  }
}
