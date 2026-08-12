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

  {
    /*
     * Ordens diretas, e não um time com gerente, porque quem coordena um
     * tratamento é o médico da pessoa. Um agente na cabeceira desenhando o
     * caminho seria a imagem errada de um time que existe para apoiar uma
     * conduta que já foi prescrita fora daqui.
     */
    id: 'health',
    label: 'Time de Acompanhamento no Mounjaro',
    emoji: '🩺',
    tagline: 'Nutrição, treino e organização da consulta, ao lado do seu médico.',
    objective:
      'Sustentar o dia a dia de quem faz tratamento com tirzepatida sob acompanhamento médico: comer bem com pouca fome, treinar para preservar massa magra e chegar em cada consulta com o que aconteceu registrado e as perguntas prontas. Nenhuma decisão sobre o medicamento sai daqui.',
    mode: 'orders',
    members: [
      {
        template: 'endocrine-support',
        instruction:
          'Registre o que eu senti na semana, explique em português claro o que o médico já orientou e monte a lista de perguntas da próxima consulta.',
      },
      {
        template: 'nutrition-coach',
        instruction:
          'Sugira refeições dentro das metas que a minha nutricionista passou, priorizando proteína, fibra e água nos dias de pouca fome.',
      },
      {
        template: 'personal-trainer',
        instruction:
          'Monte a sessão do dia com foco em força, ajustada à energia que eu relatar, dentro do programa que foi liberado para mim.',
      },
    ],
  },

  {
    id: 'data',
    label: 'Time de Dados',
    emoji: '🗂️',
    tagline: 'Da base que chegou ao painel, sem pular a conferência.',
    objective:
      'Transformar uma base recebida em um painel que alguém usa para decidir, com o mapeamento explícito, a limpeza escrita, os números conferidos contra a origem e nenhuma coluna entrando no painel sem se saber o que ela é.',
    mode: 'chain',
    members: [
      {
        template: 'data-mapper',
        instruction:
          'Diga o que cada coluna realmente contém, proponha o mapeamento e liste o que não tem destino.',
      },
      {
        template: 'data-engineer',
        instruction:
          'Escreva a transformação até o modelo de destino, com toda regra de limpeza registrada.',
      },
      {
        template: 'data-analyst',
        instruction:
          'Confira os números resultantes contra a origem e traga as diferenças com a query que as achou.',
      },
      {
        template: 'dashboard-designer',
        instruction:
          'Monte o painel a partir da pergunta que ele responde, não a partir das colunas disponíveis.',
      },
    ],
  },

  {
    id: 'accounting',
    label: 'Time de Contabilidade',
    emoji: '📒',
    tagline: 'Do lançamento ao fechamento explicado, em três etapas.',
    objective:
      'Fechar o mês com todo lançamento lastreado em documento, os saldos conferidos contra os sistemas de origem e cada variação relevante explicada antes de o número virar decisão.',
    mode: 'chain',
    members: [
      {
        template: 'accounting-analyst',
        instruction:
          'Classifique os fatos do mês no plano de contas e separe o que ficou sem documento suficiente.',
      },
      {
        template: 'data-analyst',
        instruction:
          'Cruze os saldos com os sistemas de origem e traga as diferenças com a query que as encontrou.',
      },
      {
        template: 'controller',
        instruction:
          'Feche o período e explique cada variação relevante, dizendo o que é sazonal e o que é tendência.',
      },
    ],
  },

  {
    id: 'tax',
    label: 'Time Fiscal',
    emoji: '🧾',
    tagline: 'Apura, confere contra a norma e devolve até fechar.',
    objective:
      'Entregar a apuração do período com memorial de cálculo reproduzível e conferida contra a legislação vigente, com cada ponto duvidoso resolvido ou explicitamente marcado para um profissional.',
    mode: 'review',
    lead: 'tax-auditor',
    members: [
      {
        template: 'tax-auditor',
        instruction:
          'Devolva enquanto houver apontamento sem norma citada ou tratamento sem base. Aponte o ponto, não a impressão.',
      },
      {
        template: 'tax-analyst',
        instruction:
          'Apure os tributos do período com o memorial de cálculo aberto, passo a passo.',
      },
      {
        template: 'contract-reviewer',
        instruction:
          'Leia os contratos do período e aponte as cláusulas que criam obrigação fiscal ou mudam o tratamento.',
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
