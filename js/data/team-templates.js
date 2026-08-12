// @ts-check
/**
 * Ready-made teams.
 *
 * A team template is a cast list, not a second copy of the agents: it names ids
 * from `templates.js` and says what each one was brought in to do. The agents
 * themselves are minted from the agent catalogue when the team is created, so a
 * template that ships an agent and a team that uses it can never drift apart.
 *
 * Pure data, like `templates.js`, so nothing here imports from `agent/` or
 * `team/` and no cycle is possible. `tests/unit/team-templates.test.js` checks
 * every id against the catalogues, because a typo would quietly drop a member
 * rather than fail.
 */

/**
 * @typedef {Object} TeamTemplateMember
 * @property {string} template  An id from TEMPLATES.
 * @property {string} instruction What this agent was told to do in this team.
 */

/**
 * @typedef {Object} TeamTemplate
 * @property {string} id
 * @property {string} label
 * @property {string} emoji
 * @property {string} tagline
 * @property {string} objective The goal the whole team is chasing.
 * @property {import('../team/types.js').TeamMode} mode
 * @property {string} [lead] A `template` id from `members`: the manager under
 *   `managed`, the evaluator under `review`. Ignored by a mode with no lead.
 * @property {ReadonlyArray<TeamTemplateMember>} members Desk order.
 */

/** @type {ReadonlyArray<TeamTemplate>} */
export const TEAM_TEMPLATES = Object.freeze([
  {
    id: 'marketing',
    label: 'Time de Marketing',
    emoji: '📣',
    tagline: 'Uma gerente decide a pauta e três especialistas colocam no ar.',
    objective:
      'Levar um lançamento ao público em uma semana: uma página que converte, os posts de cada rede e o texto encontrável na busca, tudo com a mesma mensagem.',
    mode: 'managed',
    lead: 'marketing-manager',
    members: [
      {
        template: 'marketing-manager',
        instruction:
          'Feche a pauta da semana, decida o que fica de fora, distribua as peças entre os três e cobre cada uma antes de dar por encerrado.',
      },
      {
        template: 'social-media',
        instruction:
          'Adapte a mensagem da campanha para cada rede, com o formato e o corte que cada uma pede.',
      },
      {
        template: 'copywriter',
        instruction:
          'Escreva a landing page e os anúncios, com duas versões de headline para a gerente escolher.',
      },
      {
        template: 'seo-editor',
        instruction:
          'Revise a página e os textos longos para busca, sem estragar a leitura de quem chegou por outro caminho.',
      },
    ],
  },

  {
    id: 'quality',
    label: 'Plantão de Qualidade',
    emoji: '🛟',
    tagline: 'Quatro etapas em fila, do relato confuso até a correção no ar.',
    objective:
      'Levar um relato confuso de bug até a correção publicada, sem pular a verificação no caminho nem descobrir o problema de novo em produção.',
    mode: 'chain',
    members: [
      {
        template: 'bug-triage',
        instruction:
          'Transforme o relato em um caso reproduzível: passos, resultado esperado e resultado obtido.',
      },
      {
        template: 'qa-tester',
        instruction:
          'Reproduza o caso e procure o caminho vizinho que ninguém testou. Devolva o que quebra junto.',
      },
      {
        template: 'code-review',
        instruction:
          'Leia o diff da correção e diga se ela resolve o caso sem abrir outro.',
      },
      {
        template: 'devops-oncall',
        instruction:
          'Publique a correção e diga o que observar depois do deploy para saber se resolveu.',
      },
    ],
  },

  {
    id: 'editorial',
    label: 'Mesa de Revisão',
    emoji: '🔁',
    tagline: 'Dois escrevem, um avalia e devolve até passar.',
    objective:
      'Publicar a documentação do produto de forma que alguém consiga seguir sem perguntar, e que soe como a mesma empresa em toda página.',
    mode: 'review',
    lead: 'brand-voice',
    members: [
      {
        template: 'brand-voice',
        instruction:
          'Devolva enquanto não soar como a empresa. Aponte a frase, não a impressão geral.',
      },
      {
        template: 'tech-writer',
        instruction: 'Escreva o passo a passo, do primeiro comando até a confirmação de que funcionou.',
      },
      {
        template: 'seo-editor',
        instruction: 'Torne cada página encontrável por quem tem o problema, sem encher de palavra-chave.',
      },
    ],
  },
])

/**
 * @param {string} id
 * @returns {TeamTemplate | undefined}
 */
export function getTeamTemplate(id) {
  return TEAM_TEMPLATES.find((template) => template.id === id)
}

/**
 * @param {string} value
 * @returns {boolean}
 */
export function isTeamTemplateId(value) {
  return TEAM_TEMPLATES.some((template) => template.id === value)
}
