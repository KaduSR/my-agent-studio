// @ts-check
/**
 * The two tracks behind "Como funciona".
 *
 * There are two now because the question has two answers at different altitudes.
 * "How do I build one of these" is the first track, and it is the tour of the
 * nine steps this app actually has. "What is one of these" is the second, and it
 * is about loops, workflows and what autonomy costs, none of which is a field in
 * the builder.
 *
 * Splitting them was better than appending. The first track ends by putting the
 * user in the builder, which is the whole job of the button; twelve more slides
 * of systems theory after that call to action would bury it, and someone who came
 * to learn what an agent loop is should not have to sit through nine form fields
 * first.
 *
 * Both are decks of the same shape, drawn with the same puppet, so the presenter
 * in ui/keynote.js does not need to know which one it is showing.
 */

import { KEYNOTE } from './keynote.js'
import { KEYNOTE_AGENTIC } from './keynote-agentic.js'

/**
 * @typedef {Object} KeynoteTrack
 * @property {string} id
 * @property {string} eyebrow Small label above the title, on the menu card.
 * @property {string} title
 * @property {string} description One line, on the menu card.
 * @property {import('../ui/puppet.js').PuppetStage} stage The figure on the card.
 * @property {ReadonlyArray<import('./keynote.js').KeynoteSlide>} slides
 */

/** @type {ReadonlyArray<KeynoteTrack>} */
export const KEYNOTE_TRACKS = Object.freeze([
  {
    id: 'first-agent',
    eyebrow: 'Comece por aqui',
    title: 'Meu primeiro agente',
    description:
      'O boneco de madeira, do bloco na bancada até o menino que sai pelo mundo. Uma etapa do estúdio por slide.',
    stage: 'wood',
    slides: KEYNOTE,
  },
  {
    id: 'agentic',
    eyebrow: 'Um nível acima',
    title: 'Sistemas agênticos',
    description:
      'O que separa um modelo que responde de um agente que executa: o laço, os workflows, os guardrails e o que a autonomia cobra.',
    stage: 'loop',
    slides: KEYNOTE_AGENTIC,
  },
])

/**
 * @param {string} id
 * @returns {KeynoteTrack | undefined}
 */
export function getTrack(id) {
  return KEYNOTE_TRACKS.find((track) => track.id === id)
}
