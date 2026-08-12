// @ts-check
/**
 * How a team works.
 *
 * The four modes are the four shapes the "Sistemas agênticos" track already
 * teaches (see data/keynote-agentic.js): parallelisation, prompt chaining,
 * evaluator-optimizer and orchestrator-worker. This screen is where someone
 * builds one instead of reading about it, so the vocabulary is deliberately the
 * same on both sides of the product.
 *
 * Pure data, like tones.js and memory.js: the option cards, the office layout,
 * the exported Markdown and the loop written into CLAUDE.md all read from here,
 * so a fifth mode is an entry in this file rather than five switch statements
 * that can disagree with each other.
 */

/**
 * The seat a mode singles out, if any.
 *
 * `manager` decides who does what while the work is running. `reviewer` never
 * assigns anything: it takes what came back and sends it round again. Two
 * genuinely different jobs, which is why the field they share is called `lead`
 * and not `manager`.
 *
 * @typedef {'manager' | 'reviewer'} TeamLeadRole
 */

/**
 * @typedef {Object} TeamModeDefinition
 * @property {import('../team/types.js').TeamMode} id
 * @property {string} label
 * @property {string} description Shown on the option card.
 * @property {string} icon
 * @property {'room' | 'flow'} layout How the office draws it. `room` is the desks
 *   on a floor; `flow` is a pipeline, which is the honest picture when the work
 *   travels from one agent to the next.
 * @property {FlowShape} [flow] Required by `flow` layout, absent otherwise.
 * @property {TeamLeadRole | null} lead The role the singled-out seat holds.
 * @property {string} [leadLabel] What that seat is called, in the interface.
 * @property {string} [promoteLabel] The action that moves the role to a desk.
 * @property {boolean} sequential True when desk order is the running order.
 * @property {string} instructionLabel Field label on an ordinary desk.
 * @property {string} instructionPlaceholder
 * @property {string} [leadInstructionLabel] Field label on the singled-out desk.
 * @property {string} [leadInstructionPlaceholder]
 * @property {string} caption One line under the room, saying what is happening.
 * @property {string} summary The prose that goes into the exported document.
 * @property {ReadonlyArray<string>} loop What one iteration is, for CLAUDE.md.
 * @property {string} stop Who or what ends the loop, for CLAUDE.md.
 */

/**
 * The words on a pipeline: where work comes in, what an arrow means, where it
 * leaves, and, when there is one, what the arrow going backwards means.
 *
 * @typedef {Object} FlowShape
 * @property {string} start
 * @property {string} end
 * @property {string} enter Label on the first arrow, out of the start.
 * @property {string} forward Label on every arrow between two agents.
 * @property {string} finish Label on the last arrow, into the end.
 * @property {string} [back] The feedback edge. Only a loop has one.
 */

/** @type {ReadonlyArray<TeamModeDefinition>} */
export const TEAM_MODES = Object.freeze([
  {
    id: 'orders',
    label: 'Ordens diretas',
    description: 'Você decide quem faz o quê antes de começar. Cada agente recebe a sua parte.',
    icon: 'list-ordered',
    layout: 'room',
    lead: null,
    sequential: false,
    instructionLabel: 'Ordem para este agente',
    instructionPlaceholder: 'Ex.: revisar o texto e apontar o que está frágil.',
    caption: 'Cada agente recebe uma ordem própria e responde apenas por ela.',
    summary:
      'Cada agente recebe uma ordem própria, definida antes de o trabalho começar, e responde apenas por ela. Não há ninguém coordenando durante a execução.',
    loop: [
      'Leia o objetivo do time e a lista de ordens.',
      'Invoque o subagente da primeira ordem ainda não concluída e passe a ordem dele.',
      'Leia o que voltou e avalie se a ordem foi cumprida como escrito.',
      'Se não foi, devolva ao mesmo agente com o que faltou. Se foi, marque como concluída.',
      'Decida: ainda existe ordem pendente? Se sim, volte ao passo 2.',
    ],
    stop: 'O laço termina quando toda ordem tiver sido cumprida, ou quando uma delas se mostrar impossível e isso for dito explicitamente.',
  },

  {
    id: 'chain',
    label: 'Linha de montagem',
    description: 'Um agente entrega ao próximo, na ordem das mesas. Ninguém pula a sua vez.',
    icon: 'arrow-right',
    layout: 'flow',
    flow: {
      start: 'Entrada',
      end: 'Entregue',
      enter: 'começa em',
      forward: 'entrega para',
      finish: 'pronto',
    },
    lead: null,
    sequential: true,
    instructionLabel: 'Etapa deste agente',
    instructionPlaceholder: 'Ex.: transformar o relato em um caso reproduzível.',
    caption: 'A saída de cada mesa é a entrada da próxima. A ordem das mesas é a ordem do trabalho.',
    summary:
      'O trabalho passa de mão em mão na ordem das etapas: a saída de cada agente é a entrada do próximo, e nenhum começa antes de o anterior entregar. É o encadeamento, e o caminho foi escolhido por quem montou o time, não pelo modelo.',
    loop: [
      'Leia o objetivo do time e a lista de etapas, na ordem.',
      'Invoque o subagente da primeira etapa ainda não concluída, passando o que a etapa anterior entregou.',
      'Leia o que voltou e avalie se serve de entrada para a próxima etapa.',
      'Se não serve, devolva ao mesmo agente dizendo o que falta. Se serve, siga para a etapa seguinte.',
      'Decida: ainda existe etapa pendente? Se sim, volte ao passo 2.',
    ],
    stop: 'O laço termina quando a última etapa entregar, ou quando uma etapa se mostrar impossível e isso for dito explicitamente, sem pular para a seguinte.',
  },

  {
    id: 'review',
    label: 'Dupla de revisão',
    description: 'Uns produzem, um avalia e devolve. Roda de novo até passar.',
    icon: 'rotate-ccw',
    layout: 'flow',
    flow: {
      start: 'Pedido',
      end: 'Aprovado',
      enter: 'quem produz',
      forward: 'manda para revisão',
      finish: 'aprovado',
      back: 'devolve para corrigir',
    },
    lead: 'reviewer',
    leadLabel: 'Avaliador',
    promoteLabel: 'Tornar avaliador',
    sequential: false,
    instructionLabel: 'O que este agente produz',
    instructionPlaceholder: 'Ex.: escrever o passo a passo da instalação.',
    leadInstructionLabel: 'O que este avaliador cobra',
    leadInstructionPlaceholder: 'Ex.: devolver enquanto não soar como a empresa.',
    caption: 'O avaliador não distribui trabalho: ele devolve o que ainda não passou.',
    summary:
      'Uns agentes produzem e um avalia. O avaliador não distribui trabalho: ele lê o que voltou, aponta o que ainda não está bom e devolve para quem produziu, quantas vezes for preciso. É o padrão avaliador-otimizador.',
    loop: [
      'Invoque cada agente produtor e recolha o que ele entregou.',
      'Passe o resultado ao avaliador, junto com o objetivo do time.',
      'Leia o retorno do avaliador: ou ele aprova, ou ele diz exatamente o que falta.',
      'Se não aprovou, devolva a quem produziu com os apontamentos e volte ao passo 1 apenas para o que foi devolvido.',
      'Decida: ainda existe alguma peça reprovada? Se sim, volte ao passo 2.',
    ],
    stop: 'Quem decide parar é o avaliador, quando aprovar tudo, ou quando disser que uma peça não tem conserto com este time e explicar por quê.',
  },

  {
    id: 'managed',
    label: 'Time com gerente',
    description: 'Um agente recebe o objetivo, divide o trabalho e responde pelo resultado.',
    icon: 'handshake',
    layout: 'room',
    lead: 'manager',
    leadLabel: 'Gerente',
    promoteLabel: 'Tornar gerente',
    sequential: false,
    instructionLabel: 'Especialidade no time',
    instructionPlaceholder: 'Ex.: cuida da checagem de fatos.',
    leadInstructionLabel: 'Como este gerente deve coordenar',
    leadInstructionPlaceholder: 'Ex.: divida por especialidade e consolide antes de entregar.',
    caption: 'O gerente decide o próximo passo a cada rodada e responde pelo resultado.',
    summary:
      'Um agente é o gerente: recebe o objetivo, divide o trabalho entre os especialistas, decide a quem delegar a cada passo e responde pelo resultado final. É o padrão orquestrador-trabalhador.',
    loop: [
      'Assuma o papel do gerente deste time.',
      'Leia o objetivo do time e o estado atual do trabalho.',
      'Escolha o próximo passo e delegue ao especialista adequado, invocando o subagente pelo nome.',
      'Leia o que voltou, avalie se aproxima do objetivo e registre o que foi feito.',
      'Decida: o objetivo foi atingido, ou falta um próximo passo? Se falta, volte ao passo 3.',
    ],
    stop: 'Quem decide parar é o gerente, quando o objetivo do time estiver atingido, ou quando concluir que ele não é atingível com este time e disser por quê.',
  },
])

/** @type {ReadonlyArray<import('../team/types.js').TeamMode>} */
export const TEAM_MODE_IDS = Object.freeze(TEAM_MODES.map((mode) => mode.id))

/** @type {import('../team/types.js').TeamMode} */
export const DEFAULT_TEAM_MODE = 'orders'

/**
 * Always resolves, so no caller has to defend against a mode that vanished.
 * @param {import('../team/types.js').TeamMode} id
 * @returns {TeamModeDefinition}
 */
export function getTeamMode(id) {
  const found = TEAM_MODES.find((mode) => mode.id === id)
  if (found) return found

  const fallback = TEAM_MODES.find((mode) => mode.id === DEFAULT_TEAM_MODE)
  if (!fallback) throw new Error('The default team mode is missing from the catalogue')
  return fallback
}

/**
 * @param {unknown} value
 * @returns {value is import('../team/types.js').TeamMode}
 */
export function isTeamMode(value) {
  return typeof value === 'string' && TEAM_MODE_IDS.includes(/** @type {any} */ (value))
}

/**
 * Whether a mode singles out a seat at all.
 * @param {import('../team/types.js').TeamMode} id
 * @returns {boolean}
 */
export function modeNeedsLead(id) {
  return getTeamMode(id).lead !== null
}

/**
 * What the singled-out seat is called, for the badge and the announcements.
 * @param {import('../team/types.js').TeamMode} id
 * @returns {string}
 */
export function leadLabel(id) {
  return getTeamMode(id).leadLabel ?? 'Líder'
}
