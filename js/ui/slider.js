// @ts-check
/**
 * Behavioural slider (SPEC 26).
 *
 * A native <input type="range"> underneath: keyboard support, screen-reader
 * semantics and touch behaviour all come from the platform. The only thing
 * added is aria-valuetext, so the value is announced as "Equilibrado" rather
 * than as a bare "50" (SPEC 26, SPEC 65).
 */

import { h, on } from '../lib/dom.js'
import { icon } from '../icons.js'
import { sliderBand } from '../data/behavior-sliders.js'
import { infoTooltip } from './tooltip.js'

/**
 * @param {Object} config
 * @param {import('../data/behavior-sliders.js').SliderDefinition} config.definition
 * @param {number} config.value
 * @param {(value: number) => void} config.onChange
 * @returns {HTMLElement}
 */
export function behaviorSlider({ definition, value, onChange }) {
  const inputId = `slider-${definition.id}`
  const band = () => sliderBand(Number(input.value), definition.lowLabel, definition.highLabel)

  const readout = h('span', { class: 'slider__readout' }, sliderBand(value, definition.lowLabel, definition.highLabel))

  const input = h('input', {
    type: 'range',
    id: inputId,
    class: 'slider__input',
    min: '0',
    max: '100',
    step: '1',
    value: String(value),
    'aria-valuetext': sliderBand(value, definition.lowLabel, definition.highLabel),
  })

  const sync = () => {
    const next = Number(input.value)
    input.setAttribute('aria-valuetext', band())
    readout.textContent = band()
    input.style.setProperty('--slider-fill', `${next}%`)
    onChange(next)
  }

  input.style.setProperty('--slider-fill', `${value}%`)
  on(input, 'input', sync)

  return h(
    'div',
    { class: 'slider' },
    h(
      'div',
      { class: 'slider__header' },
      h(
        'label',
        { class: 'slider__label field-label', htmlFor: inputId },
        icon(/** @type {any} */ (definition.icon), { size: 15 }),
        definition.label,
        definition.tooltip ? infoTooltip(definition.tooltip, `Sobre ${definition.label}`) : null
      ),
      readout
    ),
    h('p', { class: 'slider__question helper' }, definition.question),
    h(
      'div',
      { class: 'slider__track-row' },
      h('span', { class: 'slider__end helper' }, definition.lowLabel),
      input,
      h('span', { class: 'slider__end helper' }, definition.highLabel)
    )
  )
}
