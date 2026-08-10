// @ts-check
/** Tone of voice options (SPEC 23). Rendered as a visual card grid, never a dropdown. */

/**
 * @typedef {Object} ToneOption
 * @property {string} id
 * @property {string} label
 * @property {string} icon
 * @property {string} description
 */

/** SPEC 23: at most three tones may be active at once. */
export const MAX_TONES = 3

/** @type {ReadonlyArray<ToneOption>} */
export const TONES = Object.freeze([
  { id: 'friendly', label: 'Amigável', icon: 'smile', description: 'Conversa de forma acolhedora e próxima.' },
  { id: 'didactic', label: 'Didático', icon: 'graduation-cap', description: 'Explica passo a passo, como um bom professor.' },
  { id: 'direct', label: 'Direto', icon: 'arrow-right', description: 'Vai ao ponto, sem rodeios.' },
  { id: 'inspiring', label: 'Inspirador', icon: 'sparkles', description: 'Motiva e mostra o que é possível.' },
  { id: 'analytical', label: 'Analítico', icon: 'chart-line', description: 'Decompõe o problema com rigor.' },
  { id: 'creative', label: 'Criativo', icon: 'palette', description: 'Propõe caminhos inesperados.' },
  { id: 'professional', label: 'Profissional', icon: 'briefcase', description: 'Mantém um registro formal e confiável.' },
  { id: 'calm', label: 'Calmo', icon: 'leaf', description: 'Transmite serenidade mesmo sob pressão.' },
  { id: 'provocative', label: 'Provocador', icon: 'flame', description: 'Questiona premissas para gerar reflexão.' },
  { id: 'energetic', label: 'Energético', icon: 'zap', description: 'Traz ritmo e entusiasmo à conversa.' },
  { id: 'consultative', label: 'Consultivo', icon: 'handshake', description: 'Age como um parceiro que aconselha.' },
  { id: 'objective', label: 'Objetivo', icon: 'crosshair', description: 'Prioriza fatos e conclusões claras.' },
])

/**
 * @param {string} id
 * @returns {ToneOption | undefined}
 */
export function getTone(id) {
  return TONES.find((tone) => tone.id === id)
}

/**
 * Human labels for the generated Markdown (SPEC 35).
 * @param {ReadonlyArray<string>} ids
 * @returns {string[]}
 */
export function toneLabels(ids) {
  return ids.map((id) => getTone(id)?.label ?? id)
}
