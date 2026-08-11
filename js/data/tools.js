// @ts-check
/**
 * Tool catalogue (SPEC 29, 30).
 *
 * These are *declarations*: the agent states which capabilities it expects to
 * have. SPEC 7 rules out actually executing anything in the MVP, so nothing
 * here connects to a real integration.
 *
 * Two things beyond the name and the icon matter, and both come from how these
 * documents are actually read by a harness:
 *
 * - `category`, because a flat list of twenty-six is a wall. The groups are the
 *   user's mental model ("buscar e ler", "arquivos e código"), never the
 *   vendor's taxonomy.
 * - `defaultPermission`, because "has a terminal" and "may run commands without
 *   asking" are different statements, and the second one is the one that keeps
 *   people up at night. The default per tool is the cautious reading: anything
 *   that writes or leaves the machine starts at `ask`.
 *
 * Ids are permanent. Saved agents and every template in data/templates.js refer
 * to tools by id, so an id may be added but never renamed.
 */

/**
 * How much rope the tool gets.
 *
 * Deliberately three, not a free-text field: these are the three answers every
 * harness has a real setting for, and a fourth option would only be a way of
 * avoiding the choice.
 *
 * @typedef {'ask' | 'auto' | 'read-only'} ToolPermission
 */

/**
 * @typedef {Object} ToolPermissionOption
 * @property {ToolPermission} id
 * @property {string} label
 * @property {string} icon
 * @property {string} description
 * @property {string} markdownLabel Phrasing used in the exported document.
 */

/** @type {ReadonlyArray<ToolPermissionOption>} */
export const TOOL_PERMISSIONS = Object.freeze([
  {
    id: 'ask',
    label: 'Pergunta antes',
    icon: 'circle-help',
    description: 'Explica o que vai fazer e espera você confirmar.',
    markdownLabel: 'pergunta antes de usar',
  },
  {
    id: 'auto',
    label: 'Usa sozinho',
    icon: 'zap',
    description: 'Usa quando julgar necessário, sem interromper você.',
    markdownLabel: 'usa sem pedir confirmação',
  },
  {
    id: 'read-only',
    label: 'Só leitura',
    icon: 'eye',
    description: 'Pode consultar, nunca alterar nem apagar.',
    markdownLabel: 'somente leitura',
  },
])

/** @type {ToolPermission} */
export const DEFAULT_TOOL_PERMISSION = 'ask'

/**
 * @typedef {Object} ToolCategory
 * @property {string} id
 * @property {string} label
 * @property {string} icon
 * @property {string} description
 */

/** @type {ReadonlyArray<ToolCategory>} */
export const TOOL_CATEGORIES = Object.freeze([
  {
    id: 'research',
    label: 'Buscar e ler',
    icon: 'search',
    description: 'De onde ele tira informação que não estava no treino.',
  },
  {
    id: 'code',
    label: 'Arquivos e código',
    icon: 'terminal',
    description: 'O que ele pode abrir, rodar e modificar.',
  },
  {
    id: 'data',
    label: 'Dados',
    icon: 'database',
    description: 'Onde ele consulta números para embasar uma resposta.',
  },
  {
    id: 'comms',
    label: 'Comunicação',
    icon: 'mail',
    description: 'Por onde ele fala com gente de fora da conversa.',
  },
  {
    id: 'create',
    label: 'Criação',
    icon: 'palette',
    description: 'O que ele produz além de texto.',
  },
  {
    id: 'connect',
    label: 'Integrações e sistema',
    icon: 'plug',
    description: 'Como ele se liga ao resto das suas ferramentas.',
  },
])

/**
 * @typedef {Object} ToolDefinition
 * @property {string} id
 * @property {string} name
 * @property {string} icon
 * @property {string} category      One of TOOL_CATEGORIES.
 * @property {string} description   Plain-language explanation (SPEC 61).
 * @property {string} defaultPurpose Pre-filled purpose when the tool is enabled.
 * @property {ToolPermission} defaultPermission
 * @property {string[]} suggestedRules Usage guardrails offered per tool (SPEC 30).
 */

/** @type {ReadonlyArray<ToolDefinition>} */
export const TOOLS = Object.freeze([
  /* ----------------------------- buscar e ler ---------------------------- */
  {
    id: 'web-search',
    name: 'Web Search',
    icon: 'globe',
    category: 'research',
    description: 'Buscar informação atualizada na internet.',
    defaultPurpose: 'Buscar informação atual e verificar fatos antes de responder.',
    defaultPermission: 'auto',
    suggestedRules: ['Citar a fonte de cada afirmação relevante', 'Preferir fontes primárias'],
  },
  {
    id: 'browser',
    name: 'Browser',
    icon: 'app-window',
    category: 'research',
    description: 'Abrir e ler páginas específicas.',
    defaultPurpose: 'Ler páginas indicadas pelo usuário e extrair o conteúdo relevante.',
    defaultPermission: 'auto',
    suggestedRules: ['Não preencher formulários sem confirmação'],
  },
  {
    id: 'knowledge-base',
    name: 'Base de Conhecimento',
    icon: 'folder-tree',
    category: 'research',
    description: 'Consultar a documentação interna da empresa.',
    defaultPurpose: 'Responder com base nos documentos internos, e não em suposição.',
    defaultPermission: 'auto',
    suggestedRules: [
      'Citar o documento e a seção consultada',
      'Dizer quando a base não cobre a pergunta',
    ],
  },
  {
    id: 'documents',
    name: 'Leitor de Documentos',
    icon: 'file-text',
    category: 'research',
    description: 'Ler PDFs, planilhas e apresentações enviadas.',
    defaultPurpose: 'Extrair o conteúdo de arquivos enviados pelo usuário.',
    defaultPermission: 'auto',
    suggestedRules: [
      'Indicar a página de onde veio cada informação',
      'Avisar quando o arquivo estiver ilegível',
    ],
  },

  /* -------------------------- arquivos e código -------------------------- */
  {
    id: 'files',
    name: 'Files',
    icon: 'folder',
    category: 'code',
    description: 'Ler e escrever arquivos do projeto.',
    defaultPurpose: 'Ler e organizar arquivos de trabalho do usuário.',
    defaultPermission: 'ask',
    suggestedRules: ['Nunca apagar arquivos sem confirmação explícita'],
  },
  {
    id: 'terminal',
    name: 'Terminal',
    icon: 'terminal',
    category: 'code',
    description: 'Executar comandos no sistema.',
    defaultPurpose: 'Executar comandos de build, teste e inspeção.',
    defaultPermission: 'ask',
    suggestedRules: ['Explicar o comando antes de executar', 'Nunca executar comandos destrutivos'],
  },
  {
    id: 'code-execution',
    name: 'Code Execution',
    icon: 'cpu',
    category: 'code',
    description: 'Rodar código para validar uma hipótese.',
    defaultPurpose: 'Executar trechos de código para verificar resultados.',
    defaultPermission: 'ask',
    suggestedRules: ['Rodar apenas código isolado, sem efeitos colaterais'],
  },
  {
    id: 'git',
    name: 'Git',
    icon: 'code',
    category: 'code',
    description: 'Ler histórico, criar branches e commits.',
    defaultPurpose: 'Entender o histórico do projeto e registrar mudanças.',
    defaultPermission: 'ask',
    suggestedRules: [
      'Nunca reescrever histórico já publicado',
      'Nunca commitar sem revisão do usuário',
      'Trabalhar em branch própria, nunca direto na principal',
    ],
  },
  {
    id: 'issue-tracker',
    name: 'Tarefas e Issues',
    icon: 'clipboard-check',
    category: 'code',
    description: 'Consultar e atualizar o quadro de tarefas.',
    defaultPurpose: 'Acompanhar o que está em aberto e registrar o andamento.',
    defaultPermission: 'ask',
    suggestedRules: [
      'Procurar duplicata antes de abrir uma tarefa nova',
      'Nunca fechar tarefa de outra pessoa',
    ],
  },
  {
    id: 'ci-deploy',
    name: 'Build e Deploy',
    icon: 'rocket',
    category: 'code',
    description: 'Disparar pipelines e acompanhar publicações.',
    defaultPurpose: 'Rodar a esteira de testes e acompanhar o resultado.',
    defaultPermission: 'ask',
    suggestedRules: [
      'Nunca publicar em produção sem autorização explícita',
      'Relatar a falha com o log, não só com o status',
    ],
  },

  /* --------------------------------- dados ------------------------------- */
  {
    id: 'database',
    name: 'Database',
    icon: 'database',
    category: 'data',
    description: 'Consultar bases de dados.',
    defaultPurpose: 'Consultar dados para embasar análises.',
    defaultPermission: 'read-only',
    suggestedRules: ['Somente leitura, salvo autorização explícita'],
  },
  {
    id: 'spreadsheet',
    name: 'Planilhas',
    icon: 'list-tree',
    category: 'data',
    description: 'Ler e preencher planilhas de trabalho.',
    defaultPurpose: 'Consultar e organizar dados que vivem em planilhas.',
    defaultPermission: 'read-only',
    suggestedRules: [
      'Nunca sobrescrever coluna existente sem avisar',
      'Mostrar a conta por trás de cada total',
    ],
  },
  {
    id: 'analytics',
    name: 'Métricas do Produto',
    icon: 'chart-line',
    category: 'data',
    description: 'Consultar painéis de uso e comportamento.',
    defaultPurpose: 'Olhar os números de uso antes de opinar sobre o produto.',
    defaultPermission: 'auto',
    suggestedRules: [
      'Declarar o período e o filtro usados',
      'Nunca apresentar correlação como causa',
    ],
  },
  {
    id: 'vector-search',
    name: 'Busca Semântica',
    icon: 'search',
    category: 'data',
    description: 'Encontrar trechos por significado, não por palavra exata.',
    defaultPurpose: 'Recuperar o contexto relevante antes de responder.',
    defaultPermission: 'auto',
    suggestedRules: [
      'Mostrar o trecho recuperado, não apenas a conclusão',
      'Dizer quando nada suficientemente próximo foi encontrado',
    ],
  },

  /* ----------------------------- comunicação ----------------------------- */
  {
    id: 'email',
    name: 'Email',
    icon: 'mail',
    category: 'comms',
    description: 'Ler e redigir e-mails.',
    defaultPurpose: 'Redigir e organizar mensagens de e-mail.',
    defaultPermission: 'ask',
    suggestedRules: ['Nunca enviar sem revisão do usuário'],
  },
  {
    id: 'calendar',
    name: 'Calendar',
    icon: 'calendar',
    category: 'comms',
    description: 'Consultar e organizar compromissos.',
    defaultPurpose: 'Consultar disponibilidade e propor horários.',
    defaultPermission: 'ask',
    suggestedRules: ['Confirmar antes de criar ou cancelar eventos'],
  },
  {
    id: 'chat',
    name: 'Chat do Time',
    icon: 'messages-square',
    category: 'comms',
    description: 'Ler e enviar mensagens nos canais do time.',
    defaultPurpose: 'Acompanhar o que o time combinou e avisar quando algo mudar.',
    defaultPermission: 'ask',
    suggestedRules: [
      'Nunca escrever em canal público sem confirmação',
      'Nunca mencionar todo mundo de uma vez',
    ],
  },
  {
    id: 'crm',
    name: 'CRM',
    icon: 'handshake',
    category: 'comms',
    description: 'Consultar e atualizar o cadastro de clientes.',
    defaultPurpose: 'Ver o histórico do cliente antes de qualquer conversa.',
    defaultPermission: 'ask',
    suggestedRules: [
      'Nunca alterar o estágio de uma negociação sem confirmação',
      'Nunca expor dado de um cliente em resposta sobre outro',
    ],
  },

  /* -------------------------------- criação ------------------------------ */
  {
    id: 'image-generation',
    name: 'Image Generation',
    icon: 'image',
    category: 'create',
    description: 'Gerar imagens a partir de descrições.',
    defaultPurpose: 'Criar apoio visual para explicar ideias.',
    defaultPermission: 'auto',
    suggestedRules: ['Não gerar imagens de pessoas reais'],
  },
  {
    id: 'slides',
    name: 'Apresentações',
    icon: 'presentation',
    category: 'create',
    description: 'Montar e editar apresentações.',
    defaultPurpose: 'Transformar a conclusão em slides que alguém consegue apresentar.',
    defaultPermission: 'auto',
    suggestedRules: ['Uma ideia por slide', 'Nunca inventar número para preencher gráfico'],
  },
  {
    id: 'diagrams',
    name: 'Diagramas',
    icon: 'palette',
    category: 'create',
    description: 'Desenhar fluxos, arquiteturas e mapas.',
    defaultPurpose: 'Mostrar em desenho o que a explicação em texto deixa confuso.',
    defaultPermission: 'auto',
    suggestedRules: ['Explicar o diagrama em uma frase junto', 'Manter a legenda no próprio desenho'],
  },

  /* ------------------------ integrações e sistema ------------------------ */
  {
    id: 'api',
    name: 'API',
    icon: 'plug',
    category: 'connect',
    description: 'Chamar serviços externos.',
    defaultPurpose: 'Integrar com serviços externos necessários à tarefa.',
    defaultPermission: 'ask',
    suggestedRules: ['Nunca enviar dados sensíveis para terceiros'],
  },
  {
    id: 'mcp',
    name: 'Servidor MCP',
    icon: 'layers',
    category: 'connect',
    description: 'Conectar ferramentas externas por um protocolo padrão.',
    defaultPurpose: 'Alcançar as ferramentas que o time já usa, sem integração sob medida.',
    defaultPermission: 'ask',
    suggestedRules: [
      'Usar apenas servidores aprovados pelo time',
      'Listar o que cada servidor pode fazer antes de usá-lo',
    ],
  },
  {
    id: 'automation',
    name: 'Automações',
    icon: 'zap',
    category: 'connect',
    description: 'Disparar webhooks e fluxos já montados.',
    defaultPurpose: 'Acionar rotinas que já existem, em vez de refazê-las na mão.',
    defaultPermission: 'ask',
    suggestedRules: [
      'Dizer exatamente qual fluxo será disparado',
      'Nunca disparar em série sem confirmar o primeiro resultado',
    ],
  },
  {
    id: 'cloud-storage',
    name: 'Armazenamento na Nuvem',
    icon: 'hard-drive',
    category: 'connect',
    description: 'Ler e guardar arquivos em pastas compartilhadas.',
    defaultPurpose: 'Guardar o que foi produzido onde o time consegue achar.',
    defaultPermission: 'ask',
    suggestedRules: [
      'Nunca sobrescrever arquivo de outra pessoa',
      'Nunca tornar público um arquivo interno',
    ],
  },
  {
    id: 'secrets',
    name: 'Cofre de Credenciais',
    icon: 'lock',
    category: 'connect',
    description: 'Buscar segredos necessários para uma tarefa.',
    defaultPurpose: 'Obter a credencial mínima para a tarefa em andamento.',
    defaultPermission: 'ask',
    suggestedRules: [
      'Nunca imprimir o segredo na resposta',
      'Nunca guardar o segredo em arquivo nem em memória',
      'Pedir apenas o segredo daquela tarefa',
    ],
  },
])

/**
 * @param {string} id
 * @returns {ToolDefinition | undefined}
 */
export function getToolDefinition(id) {
  return TOOLS.find((tool) => tool.id === id)
}

/**
 * @param {string} id
 * @returns {ToolCategory | undefined}
 */
export function getToolCategory(id) {
  return TOOL_CATEGORIES.find((category) => category.id === id)
}

/**
 * @param {string | undefined} id
 * @returns {ToolPermissionOption}
 */
export function getToolPermission(id) {
  return (
    TOOL_PERMISSIONS.find((permission) => permission.id === id) ??
    /** @type {ToolPermissionOption} */ (
      TOOL_PERMISSIONS.find((permission) => permission.id === DEFAULT_TOOL_PERMISSION)
    )
  )
}

/**
 * True when the value is one of the three permissions.
 * @param {unknown} value
 * @returns {value is ToolPermission}
 */
export function isToolPermission(value) {
  return TOOL_PERMISSIONS.some((permission) => permission.id === value)
}
