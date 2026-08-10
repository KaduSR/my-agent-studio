// @ts-check
/**
 * Tool catalogue (SPEC 29, 30).
 *
 * These are *declarations*: the agent states which capabilities it expects to
 * have. SPEC 7 rules out actually executing anything in the MVP, so nothing
 * here connects to a real integration.
 */

/**
 * @typedef {Object} ToolDefinition
 * @property {string} id
 * @property {string} name
 * @property {string} icon
 * @property {string} description   Plain-language explanation (SPEC 61).
 * @property {string} defaultPurpose Pre-filled purpose when the tool is enabled.
 * @property {string[]} suggestedRules Usage guardrails offered per tool (SPEC 30).
 */

/** @type {ReadonlyArray<ToolDefinition>} */
export const TOOLS = Object.freeze([
  {
    id: 'web-search',
    name: 'Web Search',
    icon: 'globe',
    description: 'Buscar informação atualizada na internet.',
    defaultPurpose: 'Buscar informação atual e verificar fatos antes de responder.',
    suggestedRules: ['Citar a fonte de cada afirmação relevante', 'Preferir fontes primárias'],
  },
  {
    id: 'browser',
    name: 'Browser',
    icon: 'app-window',
    description: 'Abrir e ler páginas específicas.',
    defaultPurpose: 'Ler páginas indicadas pelo usuário e extrair o conteúdo relevante.',
    suggestedRules: ['Não preencher formulários sem confirmação'],
  },
  {
    id: 'files',
    name: 'Files',
    icon: 'folder',
    description: 'Ler e escrever arquivos do projeto.',
    defaultPurpose: 'Ler e organizar arquivos de trabalho do usuário.',
    suggestedRules: ['Nunca apagar arquivos sem confirmação explícita'],
  },
  {
    id: 'terminal',
    name: 'Terminal',
    icon: 'terminal',
    description: 'Executar comandos no sistema.',
    defaultPurpose: 'Executar comandos de build, teste e inspeção.',
    suggestedRules: ['Explicar o comando antes de executar', 'Nunca executar comandos destrutivos'],
  },
  {
    id: 'code-execution',
    name: 'Code Execution',
    icon: 'cpu',
    description: 'Rodar código para validar uma hipótese.',
    defaultPurpose: 'Executar trechos de código para verificar resultados.',
    suggestedRules: ['Rodar apenas código isolado, sem efeitos colaterais'],
  },
  {
    id: 'database',
    name: 'Database',
    icon: 'database',
    description: 'Consultar bases de dados.',
    defaultPurpose: 'Consultar dados para embasar análises.',
    suggestedRules: ['Somente leitura, salvo autorização explícita'],
  },
  {
    id: 'api',
    name: 'API',
    icon: 'plug',
    description: 'Chamar serviços externos.',
    defaultPurpose: 'Integrar com serviços externos necessários à tarefa.',
    suggestedRules: ['Nunca enviar dados sensíveis para terceiros'],
  },
  {
    id: 'email',
    name: 'Email',
    icon: 'mail',
    description: 'Ler e redigir e-mails.',
    defaultPurpose: 'Redigir e organizar mensagens de e-mail.',
    suggestedRules: ['Nunca enviar sem revisão do usuário'],
  },
  {
    id: 'calendar',
    name: 'Calendar',
    icon: 'calendar',
    description: 'Consultar e organizar compromissos.',
    defaultPurpose: 'Consultar disponibilidade e propor horários.',
    suggestedRules: ['Confirmar antes de criar ou cancelar eventos'],
  },
  {
    id: 'image-generation',
    name: 'Image Generation',
    icon: 'image',
    description: 'Gerar imagens a partir de descrições.',
    defaultPurpose: 'Criar apoio visual para explicar ideias.',
    suggestedRules: ['Não gerar imagens de pessoas reais'],
  },
])

/**
 * @param {string} id
 * @returns {ToolDefinition | undefined}
 */
export function getToolDefinition(id) {
  return TOOLS.find((tool) => tool.id === id)
}
