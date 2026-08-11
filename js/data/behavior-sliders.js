// @ts-check
/**
 * Behavioural sliders (SPEC 26).
 *
 * SPEC 61 is explicit that these must not read as model parameters: the user
 * sees "quanto espaço ele terá para ser criativo?", never "temperature".
 * Each end of the scale gets a human label, and aria-valuetext announces the
 * current band instead of a bare number (SPEC 65).
 *
 * This module is the single source of truth for the whole set. `default` lives
 * here rather than in agent/defaults.js, and the ids are read back by
 * validation, by config.json and by the importer, so adding a slider is one
 * entry here instead of six lists to remember.
 *
 * Pure data: nothing here imports from `agent/`, which is what lets
 * `agent/validate.js` and `agent/files.js` depend on it without a cycle.
 */

/**
 * @typedef {'creativity' | 'precision' | 'formality' | 'proactivity' | 'detail'
 *   | 'autonomy' | 'humor' | 'technicality' | 'uncertainty'} SliderId
 */

/**
 * @typedef {Object} SliderDefinition
 * @property {SliderId} id
 * @property {string} label
 * @property {string} icon
 * @property {string} question
 * @property {string} lowLabel
 * @property {string} highLabel
 * @property {number} default
 * @property {[string, string, string, string, string]} bands Low to high.
 * @property {string} [tooltip]
 */

/**
 * Bands are written out rather than derived from the end labels.
 *
 * The old formula prefixed "Muito" to the low label, which reads fine for an
 * adjective ("Muito conservador") and badly for anything else ("Muito só
 * responde"). Spelling the five out costs a line and never produces a sentence
 * nobody would say.
 *
 * @type {ReadonlyArray<SliderDefinition>}
 */
export const BEHAVIOR_SLIDERS = Object.freeze([
  {
    id: 'creativity',
    label: 'Criatividade',
    icon: 'sparkles',
    question: 'Quanto espaço ele terá para ser criativo?',
    lowLabel: 'Conservador',
    highLabel: 'Experimental',
    default: 50,
    bands: ['Muito conservador', 'Conservador', 'Equilibrado', 'Experimental', 'Muito experimental'],
  },
  {
    id: 'precision',
    label: 'Precisão',
    icon: 'crosshair',
    question: 'Quanto rigor ele deve exigir de si mesmo?',
    lowLabel: 'Aproximado',
    highLabel: 'Rigoroso',
    default: 70,
    bands: ['Muito aproximado', 'Aproximado', 'Equilibrado', 'Rigoroso', 'Muito rigoroso'],
  },
  {
    id: 'formality',
    label: 'Formalidade',
    icon: 'briefcase',
    question: 'Que registro ele deve usar?',
    lowLabel: 'Informal',
    highLabel: 'Formal',
    default: 40,
    bands: ['Muito informal', 'Informal', 'Equilibrado', 'Formal', 'Muito formal'],
  },
  {
    id: 'proactivity',
    label: 'Proatividade',
    icon: 'rocket',
    question: 'Ele deve antecipar o próximo passo?',
    lowLabel: 'Só responde',
    highLabel: 'Antecipa',
    default: 60,
    bands: [
      'Responde e para',
      'Só responde',
      'Equilibrado',
      'Antecipa o próximo passo',
      'Sempre sugere o próximo passo',
    ],
  },
  {
    id: 'detail',
    label: 'Detalhamento',
    icon: 'layers',
    question: 'Quanta profundidade cada resposta deve ter?',
    lowLabel: 'Enxuto',
    highLabel: 'Aprofundado',
    default: 60,
    bands: ['Muito enxuto', 'Enxuto', 'Equilibrado', 'Aprofundado', 'Muito aprofundado'],
  },
  {
    id: 'autonomy',
    label: 'Autonomia',
    icon: 'compass',
    question: 'Quanto ele pode decidir sozinho?',
    lowLabel: 'Sempre confirma',
    highLabel: 'Decide sozinho',
    default: 50,
    bands: [
      'Confirma cada passo',
      'Confirma antes de agir',
      'Equilibrado',
      'Decide sozinho quase sempre',
      'Decide sozinho e avisa depois',
    ],
    tooltip:
      'Autonomia alta significa que o agente segue adiante sem perguntar. Combine com Guard Rails claras para evitar surpresas.',
  },
  {
    id: 'humor',
    label: 'Humor',
    icon: 'smile',
    question: 'Ele pode brincar enquanto trabalha?',
    lowLabel: 'Sério',
    highLabel: 'Brincalhão',
    default: 30,
    bands: ['Estritamente sério', 'Sério', 'Leve quando cabe', 'Brincalhão', 'Muito brincalhão'],
  },
  {
    id: 'technicality',
    label: 'Vocabulário',
    icon: 'code',
    question: 'Que nível de vocabulário ele deve usar?',
    lowLabel: 'Simples',
    highLabel: 'Técnico',
    default: 50,
    bands: [
      'Sem nenhum jargão',
      'Simples',
      'Explica o termo técnico',
      'Técnico',
      'Muito técnico',
    ],
    tooltip:
      'Isto é sobre as palavras, não sobre a profundidade. Um agente pode ser muito detalhado usando vocabulário simples.',
  },
  {
    id: 'uncertainty',
    label: 'Diante da dúvida',
    icon: 'circle-help',
    question: 'O que ele faz quando não tem certeza?',
    lowLabel: 'Assertivo',
    highLabel: 'Cauteloso',
    default: 70,
    bands: [
      'Arrisca sem avisar',
      'Assertivo',
      'Avisa quando é palpite',
      'Cauteloso',
      'Sempre diz o que não sabe',
    ],
  },
])

/** @type {ReadonlyArray<SliderId>} */
export const SLIDER_IDS = Object.freeze(BEHAVIOR_SLIDERS.map((slider) => slider.id))

/**
 * The starting position of every slider, derived so the catalogue stays the
 * only place a default is written down.
 * @returns {Record<SliderId, number>}
 */
export function defaultSliderValues() {
  return /** @type {Record<SliderId, number>} */ (
    Object.fromEntries(BEHAVIOR_SLIDERS.map((slider) => [slider.id, slider.default]))
  )
}

/**
 * @param {string} id
 * @returns {SliderDefinition | undefined}
 */
export function getSlider(id) {
  return BEHAVIOR_SLIDERS.find((slider) => slider.id === id)
}

/**
 * Human band for a 0-100 value, used in aria-valuetext and in the exported
 * Markdown so the number is never presented bare.
 *
 * The signature still takes the end labels, for the sake of the few callers
 * that hold a definition rather than an id.
 *
 * @param {number} value
 * @param {string} lowLabel
 * @param {string} highLabel
 * @param {ReadonlyArray<string>} [bands]
 * @returns {string}
 */
export function sliderBand(value, lowLabel, highLabel, bands) {
  const index = value <= 20 ? 0 : value <= 40 ? 1 : value < 60 ? 2 : value < 80 ? 3 : 4
  if (bands && bands[index]) return bands[index]
  return ['Muito ' + lowLabel.toLowerCase(), lowLabel, 'Equilibrado', highLabel, 'Muito ' + highLabel.toLowerCase()][index]
}

/**
 * @param {SliderDefinition} definition
 * @param {number} value
 * @returns {string}
 */
export function bandFor(definition, value) {
  return sliderBand(value, definition.lowLabel, definition.highLabel, definition.bands)
}

/**
 * @typedef {Object} BehaviorPreset
 * @property {string} id
 * @property {string} label
 * @property {string} icon
 * @property {string} description
 * @property {Record<SliderId, number>} values
 */

/**
 * Starting points, not straitjackets.
 *
 * Nine sliders is a lot to set one by one for someone who just wants "um agente
 * mais rigoroso". A preset moves all nine at once and is immediately editable,
 * exactly like a template is for the agent as a whole.
 *
 * @type {ReadonlyArray<BehaviorPreset>}
 */
export const BEHAVIOR_PRESETS = Object.freeze([
  {
    id: 'balanced',
    label: 'Equilibrado',
    icon: 'crosshair',
    description: 'O padrão: nada puxado para nenhum extremo.',
    values: {
      creativity: 50,
      precision: 70,
      formality: 40,
      proactivity: 60,
      detail: 60,
      autonomy: 50,
      humor: 30,
      technicality: 50,
      uncertainty: 70,
    },
  },
  {
    id: 'creative',
    label: 'Criativo',
    icon: 'sparkles',
    description: 'Arrisca ideias, conversa solto e propõe alternativas.',
    values: {
      creativity: 90,
      precision: 50,
      formality: 20,
      proactivity: 75,
      detail: 55,
      autonomy: 65,
      humor: 65,
      technicality: 30,
      uncertainty: 45,
    },
  },
  {
    id: 'rigorous',
    label: 'Rigoroso',
    icon: 'shield-check',
    description: 'Confere tudo, evita atalhos e admite o que não sabe.',
    values: {
      creativity: 25,
      precision: 95,
      formality: 60,
      proactivity: 45,
      detail: 80,
      autonomy: 30,
      humor: 10,
      technicality: 70,
      uncertainty: 90,
    },
  },
  {
    id: 'executive',
    label: 'Executivo',
    icon: 'briefcase',
    description: 'Conclusão primeiro, resposta curta, decide sozinho.',
    values: {
      creativity: 40,
      precision: 80,
      formality: 65,
      proactivity: 80,
      detail: 25,
      autonomy: 75,
      humor: 20,
      technicality: 45,
      uncertainty: 60,
    },
  },
  {
    id: 'didactic',
    label: 'Didático',
    icon: 'graduation-cap',
    description: 'Explica com calma, sem jargão, e confirma o entendimento.',
    values: {
      creativity: 55,
      precision: 80,
      formality: 25,
      proactivity: 55,
      detail: 80,
      autonomy: 30,
      humor: 45,
      technicality: 15,
      uncertainty: 80,
    },
  },
])

/**
 * @param {string} id
 * @returns {BehaviorPreset | undefined}
 */
export function getBehaviorPreset(id) {
  return BEHAVIOR_PRESETS.find((preset) => preset.id === id)
}

/**
 * Read the nine sliders back as one sentence.
 *
 * Nine numbers say nothing on their own; what the user wants to know is what
 * they add up to. Only the sliders that are actually pushed to an end are named,
 * because a summary that repeats "equilibrado" nine times is noise.
 *
 * @param {Partial<Record<SliderId, number>>} personality
 * @returns {string}
 */
export function behaviorSummary(personality) {
  const extremes = BEHAVIOR_SLIDERS.filter((slider) => {
    const value = personality[slider.id]
    return typeof value === 'number' && (value <= 25 || value >= 75)
  })

  if (extremes.length === 0) {
    return 'Equilibrado em tudo: nada puxado para um extremo.'
  }

  const parts = extremes.map((slider) =>
    bandFor(slider, personality[slider.id] ?? slider.default).toLowerCase()
  )
  const last = parts.pop()
  const sentence = parts.length > 0 ? `${parts.join(', ')} e ${last}` : String(last)
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`
}
