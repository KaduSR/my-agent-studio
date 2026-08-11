// @ts-check
/**
 * Step 4 — Personalidade (SPEC 22-26).
 *
 * Entirely visual, as SPEC 22 and SPEC 74 require: card grids and chips, no
 * dropdowns anywhere. Selection ceilings are explained rather than enforced by
 * a disabled attribute, so a user who clicks a blocked card learns why.
 */

import { h, setChildren } from '../lib/dom.js'
import { icon } from '../icons.js'
import { TONES, MAX_TONES } from '../data/tones.js'
import { TRAITS, MAX_TRAITS } from '../data/traits.js'
import { RESPONSE_STYLES } from '../data/response-styles.js'
import { BEHAVIOR_PRESETS, BEHAVIOR_SLIDERS, behaviorSummary } from '../data/behavior-sliders.js'
import {
  applyBehaviorPreset,
  builderStore,
  resetBehaviorSliders,
  setResponseStyle,
  setSlider,
  toggleTone,
  toggleTrait,
} from '../stores/builder-store.js'
import { optionCard, traitChip, wireRadioGroup } from '../ui/option-card.js'
import { behaviorSlider } from '../ui/slider.js'
import { showToast } from '../ui/toast.js'
import { reactiveBlock, section, stepShell } from './step-shell.js'

/**
 * @param {number} count
 * @param {number} max
 * @returns {HTMLElement}
 */
function counterBadge(count, max) {
  return h('span', { class: 'count-badge', dataset: { full: String(count >= max) } }, `${count}/${max}`)
}

/** @returns {import('./step-shell.js').StepView} */
export function personalityStep() {
  const toneCount = h('span')
  const traitCount = h('span')

  const tones = reactiveBlock(
    (state) => state.agent.personality.tones,
    (container) => {
      const selected = builderStore.getState().agent.personality.tones
      setChildren(toneCount, counterBadge(selected.length, MAX_TONES))
      setChildren(
        container,
        h(
          'div',
          { class: 'card-grid', role: 'group', 'aria-label': 'Tom de voz' },
          ...TONES.map((tone) =>
            optionCard({
              role: 'checkbox',
              label: tone.label,
              description: tone.description,
              iconName: tone.icon,
              focusKey: `tone-${tone.id}`,
              selected: selected.includes(tone.id),
              blocked: selected.length >= MAX_TONES,
              blockedHint: `Você já escolheu ${MAX_TONES} tons. Desmarque um para trocar.`,
              onToggle: () => {
                if (!toggleTone(tone.id)) {
                  showToast({
                    message: `Escolha no máximo ${MAX_TONES} tons. Desmarque um para trocar.`,
                    variant: 'info',
                  })
                }
              },
            })
          )
        )
      )
    }
  )

  const styles = reactiveBlock(
    (state) => state.agent.personality.responseStyle,
    (container) => {
      const current = builderStore.getState().agent.personality.responseStyle
      const group = h(
        'div',
        { class: 'card-list', 'aria-label': 'Estilo de resposta' },
        ...RESPONSE_STYLES.map((style) =>
          optionCard({
            role: 'radio',
            layout: 'row',
            label: style.label,
            description: style.description,
            iconName: style.icon,
            focusKey: `style-${style.id}`,
            selected: style.id === current,
            onToggle: () => setResponseStyle(style.id),
          })
        )
      )
      wireRadioGroup(group)
      setChildren(container, group)
    }
  )

  const traits = reactiveBlock(
    (state) => state.agent.personality.traits,
    (container) => {
      const selected = builderStore.getState().agent.personality.traits
      setChildren(traitCount, counterBadge(selected.length, MAX_TRAITS))
      setChildren(
        container,
        h(
          'div',
          { class: 'chip-row', role: 'group', 'aria-label': 'Traços de personalidade' },
          ...TRAITS.map((trait) =>
            traitChip({
              label: trait.label,
              focusKey: `trait-${trait.id}`,
              title: trait.description,
              selected: selected.includes(trait.id),
              blocked: selected.length >= MAX_TRAITS,
              blockedHint: `Você já escolheu ${MAX_TRAITS} traços. Desmarque um para trocar.`,
              onToggle: () => {
                if (!toggleTrait(trait.id)) {
                  showToast({
                    message: `Escolha no máximo ${MAX_TRAITS} traços. Desmarque um para trocar.`,
                    variant: 'info',
                  })
                }
              },
            })
          )
        )
      )
    }
  )

  // Sliders own their DOM value, so they are built once and never re-rendered:
  // re-rendering mid-drag would drop the pointer capture. A preset therefore
  // writes to the store *and* pushes the new values into each control by hand.
  const personality = builderStore.getState().agent.personality
  const controls = BEHAVIOR_SLIDERS.map((definition) =>
    behaviorSlider({
      definition,
      value: personality[definition.id],
      onChange: (value) => setSlider(definition.id, value),
    })
  )

  const syncSliders = () => {
    const current = builderStore.getState().agent.personality
    BEHAVIOR_SLIDERS.forEach((definition, index) => {
      controls[index].set(current[definition.id])
    })
  }

  const sliders = h('div', { class: 'slider-grid' }, ...controls.map((control) => control.element))

  const presets = h(
    'div',
    { class: 'behavior-presets', role: 'group', 'aria-label': 'Perfis de comportamento' },
    ...BEHAVIOR_PRESETS.map((preset) =>
      h(
        'button',
        {
          type: 'button',
          class: 'behavior-preset',
          title: preset.description,
          onclick: () => {
            applyBehaviorPreset(preset.id)
            syncSliders()
            showToast({ message: `Perfil ${preset.label} aplicado.`, variant: 'success' })
          },
        },
        icon(/** @type {any} */ (preset.icon), { size: 15 }),
        h('span', null, preset.label)
      )
    )
  )

  const resetButton = h(
    'button',
    {
      type: 'button',
      class: 'link-button',
      onclick: () => {
        resetBehaviorSliders()
        syncSliders()
      },
    },
    'Voltar ao padrão'
  )

  // Nine numbers say nothing on their own; this reads them back as a sentence.
  const summary = reactiveBlock(
    (state) => state.agent.personality,
    (container) => {
      setChildren(
        container,
        h(
          'p',
          { class: 'behavior-summary' },
          h('span', { class: 'behavior-summary__tag' }, 'Resumindo'),
          behaviorSummary(builderStore.getState().agent.personality)
        )
      )
    }
  )

  const element = stepShell(
    'personality',
    section(
      {
        title: 'Tom de voz',
        emoji: '🗣️',
        description: `Como ele soa ao falar. Escolha até ${MAX_TONES}.`,
        aside: toneCount,
      },
      tones.element
    ),
    section(
      { title: 'Estilo de resposta', emoji: '💬', description: 'O formato que ele usa para se explicar.' },
      styles.element
    ),
    section(
      {
        title: 'Traços',
        emoji: '🧩',
        description: `A personalidade por trás do tom. Escolha até ${MAX_TRAITS}.`,
        aside: traitCount,
      },
      traits.element
    ),
    section(
      {
        title: 'Comportamento',
        emoji: '🎚️',
        description:
          'Ajuste fino de como ele decide e responde. Comece por um perfil e mexa no que não combinar.',
        aside: resetButton,
      },
      presets,
      sliders,
      summary.element
    )
  )

  return {
    element,
    destroy: () => {
      tones.destroy()
      styles.destroy()
      traits.destroy()
      summary.destroy()
    },
  }
}
