// @ts-check
/**
 * The beginner's dictionary.
 *
 * Every term someone hits in the first week of building agents, explained
 * without jargon and anchored to the same Pinocchio figures the keynote uses.
 * The repetition is the point: once the puppet means "the model" and the string
 * means "the rig", a new word costs one image instead of one paragraph.
 *
 * Each entry says the same thing three times, in three registers: `plain` is
 * the definition someone could repeat out loud, `story` is the analogy, and
 * `example` is where the idea shows up in an afternoon of real use. Skipping
 * any of the three tends to leave a term that sounds understood but is not.
 *
 * Pure data. The presentation in ui/glossary.js decides how to render it.
 */

/**
 * @typedef {Object} GlossaryEntry
 * @property {string} id
 * @property {string} term
 * @property {import('../ui/puppet.js').PuppetStage} stage Which figure to draw.
 * @property {string} plain   One sentence, no jargon.
 * @property {string} story   The Pinocchio analogy.
 * @property {string} example Where it shows up in real use.
 */

/** @type {ReadonlyArray<GlossaryEntry>} */
export const GLOSSARY = Object.freeze([
  {
    id: 'llm',
    term: 'LLM',
    stage: 'brain',
    plain:
      'É o cérebro que já vem pronto: um programa treinado em muito texto que, diante de uma conversa, calcula qual é a próxima palavra mais provável.',
    story:
      'A cabeça do Pinóquio já sabia falar antes de Gepeto ensinar qualquer coisa. Ele não sabia quem era nem para que servia, mas as palavras já estavam lá dentro.',
    example:
      'Se você escreve "era uma vez uma", o cérebro completa "menina", "casa", "raposa". Ele não consultou nada em lugar nenhum: só sabe o que costuma vir depois.',
  },
  {
    id: 'token',
    term: 'Token',
    stage: 'tokens',
    plain:
      'É o pedacinho de texto que o modelo enxerga por vez. Não é letra nem palavra inteira: é um pedaço, e tudo é contado nessa moeda.',
    story:
      'Gepeto não fez o boneco de uma lascada só. Foi pedaço por pedaço, e cada pedaço custou um tempo da bancada.',
    example:
      '"Pinóquio" pode virar "Pin" mais "óquio": dois tokens. É por isso que existe limite de tamanho e é assim que se cobra o uso, por pedaço que entra e que sai.',
  },
  {
    id: 'prompt',
    term: 'Prompt',
    stage: 'named',
    plain: 'É o que você escreve para o agente: o pedido, com o contexto que ele precisa junto.',
    story:
      'Gepeto olhou para a estrela e disse o que queria: um menino de verdade. Curto, mas suficiente para deixar claro o que se esperava.',
    example:
      '"Escreve um e-mail" e "escreve um e-mail de três linhas para meu chefe pedindo folga na sexta" pedem a mesma coisa. Só o segundo diz o bastante para dar certo de primeira.',
  },
  {
    id: 'context',
    term: 'Contexto',
    stage: 'memory',
    plain:
      'É tudo o que o agente tem à vista agora: sua pergunta, o que já foi dito e os arquivos abertos. E cabe só um tanto de cada vez.',
    story:
      'Pinóquio lembrava das aventuras do dia. Mas quando a viagem esticava demais, o começo ia ficando para trás.',
    example:
      'Numa conversa muito longa, o início sai da mesa e o agente passa a responder sem ele. Não é má vontade nem esquecimento: aquilo simplesmente não está mais à vista.',
  },
  {
    id: 'harness',
    term: 'Harness',
    stage: 'harness',
    plain:
      'É a estrutura em volta do modelo: o que liga o cérebro ao mundo, entrega as ferramentas, executa o que ele pede e devolve o resultado.',
    story:
      'Um cérebro sozinho é uma cabeça que fala. A cruzeta e os fios são o que transformam intenção em movimento.',
    example:
      'O Claude Code é um harness. O modelo diz "preciso ler este arquivo"; quem abre o arquivo de verdade, lê e devolve o conteúdo é o harness.',
  },
  {
    id: 'tools',
    term: 'Ferramentas',
    stage: 'tools',
    plain:
      'São as ações que o agente pode pedir para executar: buscar na web, ler um arquivo, rodar um código, enviar um e-mail.',
    story:
      'Sem lanterna, a barriga da baleia é escuro e fim de papo. A ferramenta não deixa o boneco mais esperto, deixa ele capaz.',
    example:
      'Pergunte a cotação de hoje. Sem ferramenta, ele responde pelo que leu no treino, que é velho. Com busca, ele vai olhar antes de responder.',
  },
  {
    id: 'knowledge',
    term: 'Base de conhecimento',
    stage: 'knowledge',
    plain:
      'São os documentos que você entrega ao agente para ele consultar: boas práticas, guia de estilo, política interna. Valem para toda conversa, sem depender do que já foi dito.',
    story:
      'Gepeto vendeu o casaco para comprar o livro escolar. O livro não deixava o boneco mais inteligente: dizia a ele o que valia naquela escola.',
    example:
      'Sem nada, ele escreve um e-mail no tom genérico de qualquer empresa. Com o guia de voz da sua empresa na base, ele escreve no tom da sua, e consegue apontar de que trecho tirou aquilo.',
  },
  {
    id: 'agent',
    term: 'Agente',
    stage: 'boy',
    plain:
      'É o modelo com objetivo, ferramentas e permissão para decidir sozinho os passos até terminar a tarefa.',
    story:
      'O boneco virou menino quando parou de depender dos fios. Recebia um recado e resolvia o caminho por conta própria.',
    example:
      'Você pede "organize minhas fotos por ano". Ele lista as pastas, olha as datas, cria as pastas novas e move os arquivos. Você não disse nenhum desses passos.',
  },
  {
    id: 'agent-vs-automation',
    term: 'Agente ou automação?',
    stage: 'purpose',
    plain:
      'Automação percorre o trilho que alguém desenhou antes. Agente recebe o destino e escolhe o trilho na hora.',
    story:
      'A raposa enganou o Pinóquio uma vez. Na segunda, ele já decidia diferente. Um trilho de trem nunca aprende uma curva nova.',
    example:
      '"Toda sexta, envie a planilha por e-mail" é automação: se o arquivo mudar de nome, quebra. "Me mantenha informado sobre as vendas da semana" é agente: ele procura, entende e resolve.',
  },
  {
    id: 'hallucination',
    term: 'Alucinação',
    stage: 'guardrails',
    plain:
      'É quando o modelo responde com toda a confiança uma coisa que não é verdade. Ele não mente por maldade: ele completa a frase mais provável.',
    story:
      'O nariz crescia na frente de todo mundo, e o Grilo Falante estava ali justamente para avisar antes de a mentira sair.',
    example:
      'Peça a biografia de alguém que não existe e vem uma bonita, com datas e tudo. Guard Rails e ferramentas de busca são o grilo: obrigam a conferir antes de afirmar.',
  },
])
