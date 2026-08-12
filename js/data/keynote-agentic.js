// @ts-check
/**
 * The agentic narrative: from a model that answers to an agent that acts.
 *
 * A expanded summary of "The Agent Loop: How AI Goes From Answering Questions to
 * Doing Things" (ByteByteGo, jul/2026), retold with the same puppet as the first
 * track. Reusing the figure is not decoration: the marionette already means "the
 * model" and the strings already mean "the rig", so a whole systems argument
 * costs a change of scenery instead of a new vocabulary.
 *
 * Three images carry most of the weight.
 *
 * The control cross is the one that matters. In the first track it is Geppetto's,
 * and the puppet moves because someone above it decided it would. The turn into
 * an agent is the moment he takes that cross into his own hands, which is exactly
 * what "control flow handed to the model" means and is much easier to feel than
 * to define.
 *
 * The painted rail is the workflow. Its whole point is that it was painted before
 * the first step, which is the property every workflow pattern shares.
 *
 * And the nose comes back for the guardrails slide, because the first track
 * already taught it: a limit you cannot hide.
 *
 * The closing slide is the sources rather than a summary. Someone who got that
 * far is better served by the originals than by a recap.
 *
 * Pure data. The presentation in ui/keynote.js decides how to render it, and the
 * block shapes belong to ui/keynote-blocks.js.
 */

/** @type {ReadonlyArray<import('./keynote.js').KeynoteSlide>} */
export const KEYNOTE_AGENTIC = Object.freeze([
  {
    id: 'stateless',
    term: 'Stateless LLM',
    stage: 'stateless',
    eyebrow: 'O ponto de partida',
    title: 'A madeira que fala e esquece',
    story:
      'A lenha responde tudo o que Mestre Cereja pergunta, em voz alta e na hora. Mas ela não tem mão para pegar o machado, e o caixote ao lado da bancada continua vazio: nada do que ela disse ficou guardado ali.',
    lesson:
      'Uma chamada crua a um LLM é isso. Entra texto, sai texto, e nada persiste depois. Daí saem as duas limitações que explicam todo o resto, e quase toda a engenharia de sistemas agênticos é engenharia em volta delas.',
    blocks: [
      {
        type: 'points',
        caption: 'As duas consequências',
        items: [
          {
            iconName: 'circle-slash',
            label: 'Não age no mundo',
            text: 'Ele descreve o que seria uma consulta ao banco e explica como se checa a previsão do tempo, mas não toca o banco nem busca a previsão.',
          },
          {
            iconName: 'rotate-ccw',
            label: 'Não acumula nada',
            text: 'Cada requisição começa do zero. Qualquer continuidade tem que ser reconstruída pelo sistema que envolve o modelo.',
          },
        ],
      },
    ],
  },
  {
    id: 'augmented',
    term: 'Augmented LLM',
    stage: 'augmented',
    eyebrow: 'O primeiro degrau',
    title: 'Lanterna, livro e caderno',
    story:
      'Gepeto não trocou a madeira. Ele pôs uma lanterna na mão do boneco, abriu um livro na frente dele e deixou um caderno no bolso. A voz continuou a mesma, mas agora ela alcança coisas.',
    lesson:
      'Ferramentas, recuperação e memória são as três adições que fecham as lacunas da chamada crua. Juntas formam o que a Anthropic chama de LLM aumentado, a unidade fundamental de qualquer sistema agêntico. E vale notar: um assistente que roda Python, uma API com function calling, uma aplicação de RAG, tudo isso é LLM aumentado, e tudo isso ainda é uma única chamada. O modelo responde, o sistema devolve, a interação termina.',
    blocks: [
      {
        type: 'points',
        caption: 'As três capacidades',
        items: [
          {
            iconName: 'wrench',
            label: 'Ferramentas',
            text: 'O modelo pede que o sistema execute uma função definida por você: buscar um pedido, criar um ticket, rodar um script. O detalhe que costuma passar batido é que ele nunca executa nada. Ele emite uma intenção estruturada, e quem executa é o código em volta. É isso que torna o comportamento auditável, e é aí que ficam as decisões de segurança.',
          },
          {
            iconName: 'database',
            label: 'Recuperação',
            text: 'Injeta no contexto, em tempo de execução, os documentos relevantes para aquela pergunta específica. Resolve o conhecimento que o modelo não tem ou que muda com frequência.',
          },
          {
            iconName: 'hard-drive',
            label: 'Memória',
            text: 'Qualquer mecanismo que carregue informação de uma chamada para a próxima: histórico de conversa, um arquivo de estado, um resumo condensado. Como o modelo é sem estado, memória é sempre algo que o sistema mantém e reinjeta, não uma propriedade do modelo.',
          },
        ],
      },
    ],
  },
  {
    id: 'workflow',
    term: 'Workflow',
    stage: 'workflow',
    eyebrow: 'Quando uma resposta não basta',
    title: 'O trilho pintado no chão',
    story:
      'Antes de o boneco dar o primeiro passo, Gepeto pintou o caminho no chão da oficina e numerou as paradas. O boneco anda bem, e anda exatamente por onde já estava pintado.',
    lesson:
      'Problemas maiores que uma chamada levam ao encadeamento: uma chamada faz o esboço, outra expande em parágrafos, uma terceira traduz. Esse é o prompt chaining, e ele pertence à família dos workflows. Por trás da variedade, todos compartilham a mesma propriedade decisiva: o caminho e o número de passos são escolhidos por você em tempo de projeto, antes de o modelo ver qualquer entrada. É por isso que workflows são previsíveis, depuráveis, testáveis e mais baratos, e é por isso que a maioria dos sistemas em produção hoje são workflows, não agentes, mesmo quando o material de marketing os chama de agentes.',
    blocks: [
      {
        type: 'table',
        caption: 'Os padrões mais comuns da família',
        head: ['Padrão', 'Como funciona'],
        rows: [
          ['Roteamento', 'Uma classificação inicial decide qual handler especializado trata a entrada.'],
          ['Paralelização', 'Subtarefas independentes rodam ao mesmo tempo e os resultados são agregados.'],
          ['Orquestrador-trabalhador', 'Um modelo gerente decompõe a tarefa e delega pedaços a especialistas.'],
          ['Avaliador-otimizador', 'Uma chamada gera, outra critica, e o ciclo repete até a qualidade ser aceitável.'],
        ],
      },
    ],
  },
  {
    id: 'loop',
    term: 'Agent loop',
    stage: 'loop',
    eyebrow: 'A virada',
    title: 'Quando ele pega a cruzeta',
    story:
      'Num certo ponto o boneco tira a cruzeta da mão de Gepeto e passa a puxar os próprios fios. Quem decide que a peça acabou deixa de ser quem escreveu a peça.',
    lesson:
      'Um agente aparece quando você envolve o LLM aumentado num laço e entrega ao próprio modelo a decisão de quando o laço termina. O laço em si é código banal. O que muda de patamar é a transferência do controle de fluxo: no workflow o desenvolvedor decidiu antes quantos passos existem, no agente o modelo decide durante a execução. Existe quase sempre um teto de iterações, mas o papel dele é ser rede de segurança contra loops infinitos e queima de tokens, não o mecanismo de parada. O sinal primário vem do modelo, e toda a autonomia útil, todo o custo imprevisível e toda a dificuldade de depuração derivam dessa única mudança.',
    blocks: [
      {
        type: 'flow',
        caption: 'O laço, em código banal',
        steps: [
          'chame o modelo',
          'leia a saída',
          'execute a ação que ela pede',
          'devolva o resultado ao estado',
        ],
        back: 'E chame o modelo de novo, até ele produzir uma saída que o runtime interpreta como resposta final.',
      },
    ],
  },
  {
    id: 'cycle',
    term: 'Agent iteration',
    stage: 'cycle',
    eyebrow: 'Cada volta do laço',
    title: 'Olhar, pensar, agir, olhar de novo',
    story:
      'Quatro lanternas em roda acendem sempre na mesma ordem, e a quarta é a que aponta de volta para a primeira. Tirar essa quarta não deixa três lanternas, deixa uma fila: o boneco passa a andar pelo que imaginava antes de agir, e não pelo que aconteceu.',
    lesson:
      'A observação é o passo que costuma ser subestimado, e é o mais estrutural dos quatro. É o fechamento do ciclo, cada ação seguida da sua consequência real, que permite ao agente corrigir rota, perceber que uma ferramenta falhou ou descobrir que a premissa inicial estava errada.',
    blocks: [
      {
        type: 'points',
        caption: 'A anatomia de uma iteração',
        items: [
          {
            iconName: 'eye',
            label: 'Perceber',
            text: 'O runtime entrega ao modelo o estado atual: a tarefa original, o histórico do que já aconteceu e qualquer entrada nova.',
          },
          {
            iconName: 'brain',
            label: 'Raciocinar',
            text: 'O turno do modelo, que produz uma saída dizendo o que fazer em seguida.',
          },
          {
            iconName: 'zap',
            label: 'Agir',
            text: 'O runtime executa o que foi pedido.',
          },
          {
            iconName: 'rotate-ccw',
            label: 'Observar',
            text: 'O resultado dessa ação é capturado e dobrado de volta no estado, para que o modelo o veja na próxima percepção.',
          },
        ],
      },
    ],
  },
  {
    id: 'decisions',
    term: 'Agent turn',
    stage: 'decisions',
    eyebrow: 'A cada turno',
    title: 'Quatro saídas do palco',
    story:
      'Do palco saem quatro caminhos: a porta da rua, a ferramenta na parede, outro boneco esperando nos bastidores e um balão de pensamento que não leva a lugar nenhum. A cada volta ele escolhe um.',
    lesson:
      'Quando o modelo produz sua saída, ela cai em uma dessas quatro categorias, e o runtime ramifica de acordo. É essa ramificação que dá a sensação de inteligência ao sistema, porque o modelo não está apenas gerando texto: está escolhendo que tipo de movimento fazer. As três primeiras são comportamentos de primeira classe em SDKs como o de agentes da OpenAI. A quarta é menos um caminho de código separado e mais uma propriedade de como o prompt foi escrito, e é o que sustenta o padrão da nota seguinte.',
    blocks: [
      {
        type: 'points',
        caption: 'As quatro decisões possíveis',
        items: [
          {
            iconName: 'check',
            label: 'Resposta final',
            text: 'O runtime lê como sinal de saída: devolve o resultado e encerra.',
          },
          {
            iconName: 'wrench',
            label: 'Chamada de ferramenta',
            text: 'Nome da função e argumentos. O runtime executa, anexa o retorno ao estado e devolve o controle ao modelo, continuando o laço.',
          },
          {
            iconName: 'handshake',
            label: 'Handoff',
            text: 'O modelo conclui que a tarefa pertence a outro agente, tipicamente um especialista com prompt e conjunto de ferramentas próprios. O runtime troca quem está rodando e passa o mesmo estado adiante, e o laço segue sob a nova identidade.',
          },
          {
            iconName: 'brain',
            label: 'Pensamento continuado',
            text: 'Um turno que é só raciocínio: o runtime captura o pensamento, devolve ao estado e roda o modelo novamente.',
          },
        ],
      },
    ],
  },
  {
    id: 'react',
    term: 'ReAct',
    stage: 'react',
    eyebrow: 'Como se preenche o laço',
    title: 'O diário do Grilo Falante',
    story:
      'O grilo anota tudo numa folha, na ordem em que acontece: pensei isso, fiz aquilo, vi este resultado. A folha nunca é apagada, e é ela que diz ao boneco qual é o passo seguinte.',
    lesson:
      'ReAct significa Reasoning and Acting, e é o padrão de prompting mais difundido nos frameworks de agente atuais. A ideia é fazer o modelo intercalar raciocínio e ação no mesmo fluxo, produzindo um traço que se lê como um diário estruturado. Dois pontos merecem atenção nele: cada ação está ancorada numa observação anterior, e os passos de raciocínio não são enfeite, são exatamente onde o modelo decide qual ação faz sentido dado o que ele acabou de aprender. Um agente sem esse espaço de raciocínio tende a escolher ferramentas de forma mais rasa.',
    blocks: [
      {
        type: 'trace',
        caption: 'Um traço de atendimento ao cliente, do começo ao fim',
        rows: [
          { kind: 'input', text: 'O usuário pergunta o status do seu pedido mais recente.' },
          { kind: 'thought', text: 'Precisa localizar o pedido. O serviço de pedidos é o lugar certo.' },
          { kind: 'action', text: 'Chama get_recent_order com o id do usuário.' },
          { kind: 'observation', text: 'Pedido 9152, feito em 14 de maio.' },
          { kind: 'thought', text: 'Agora precisa do status de envio daquele pedido específico.' },
          { kind: 'action', text: 'Chama get_shipping_status com o id do pedido.' },
          { kind: 'observation', text: 'Em trânsito, previsão de chegada em 29 de maio.' },
          { kind: 'final', text: 'Resume o status para o usuário.' },
        ],
      },
    ],
  },
  {
    id: 'gates',
    term: 'Guardrails',
    stage: 'gates',
    eyebrow: 'Onde o laço encosta no mundo',
    title: 'Três portões, um grilo em cada',
    story:
      'Um portão na entrada da oficina, um em volta de cada ferramenta na parede e um na porta da rua. Em qualquer um deles, se o boneco tenta passar com uma mentira, o nariz cresce na frente de todo mundo.',
    lesson:
      'Guardrails não são uma camada de moderação colada por cima no fim do projeto. Eles pertencem à arquitetura, e a posição correta deles é sempre a mesma: todo ponto em que o laço cruza a fronteira com o mundo externo. Ferramentas merecem atenção especial justamente porque são o único ponto em que o laço realmente toca sistemas que importam.',
    blocks: [
      {
        type: 'points',
        caption: 'As três famílias',
        items: [
          {
            iconName: 'shield-check',
            label: 'Na entrada',
            text: 'Antes de o modelo principal ver qualquer coisa é onde se barram tentativas de injeção de prompt, pedidos que violam política e entradas fora do escopo do agente. Um padrão eficiente é usar um modelo pequeno e rápido como filtro, para que o modelo caro só rode quando a entrada passar.',
          },
          {
            iconName: 'lock',
            label: 'Em volta de cada ferramenta',
            text: 'Antes da execução, pode bloquear a chamada ou substituí-la por uma mensagem de volta ao modelo, e é aqui que você impede um DELETE indevido ou uma transferência de valor não autorizada. Depois da execução, pode reescrever ou bloquear o resultado antes que ele entre no estado da conversa.',
          },
          {
            iconName: 'alert-triangle',
            label: 'Na saída final',
            text: 'Depois de o laço decidir terminar e antes de o usuário ver a resposta fica a última camada de política: vazamento de dados sensíveis, afirmações que a empresa não quer fazer em seu nome, promessas que o agente não pode garantir.',
          },
        ],
      },
    ],
  },
  {
    id: 'human',
    term: 'Human in the loop',
    stage: 'harness',
    eyebrow: 'Quando o portão não decide sozinho',
    title: 'A cruzeta de volta na mão de Gepeto',
    story:
      'Diante do portão da rua, o boneco para. Ele sabe abrir, tem a chave e ninguém o proibiu. Mesmo assim vira, estende a cruzeta para Gepeto e espera. Quem puxa os fios naquele passo é uma pessoa, e só naquele passo.',
    lesson:
      'Autonomia não é tudo ou nada. Um agente pode decidir sozinho o caminho inteiro e ainda assim parar antes de um punhado de ações, entregar a decisão a uma pessoa e continuar com a resposta dela. É isso que separa um sistema que roda em produção de uma demonstração: não é o modelo acertar sempre, é existir um ponto combinado onde o erro fica barato. A pergunta de projeto não é se o agente é capaz, é o que acontece se ele estiver errado. Onde desfazer é fácil, deixe correr. Onde não dá para desfazer, coloque alguém. Nas Ferramentas deste estúdio essa escolha tem nome e é por ferramenta: Pergunta antes, Usa sozinho e Só leitura.',
    blocks: [
      {
        type: 'points',
        caption: 'Onde vale colocar uma pessoa',
        items: [
          {
            iconName: 'lock',
            label: 'Antes do que não se desfaz',
            text: 'Apagar dados, mover dinheiro, publicar em nome de alguém, escrever para um cliente. O critério não é a importância da ação, é o custo de reverter. Um commit se reverte, um e-mail enviado não.',
          },
          {
            iconName: 'circle-help',
            label: 'Quando a confiança cai',
            text: 'Um agente que sabe dizer que está inseguro pode transformar isso em um pedido de ajuda em vez de um chute. É o mesmo comportamento que a etapa Comportamento chama de "diante da dúvida", e ele só serve se houver para quem perguntar.',
          },
          {
            iconName: 'clock',
            label: 'Sabendo o que custa',
            text: 'Cada parada troca velocidade por segurança e transfere trabalho para uma pessoa. Perguntar em tudo devolve o agente à condição de formulário caro; nunca perguntar transfere todo o risco para quem recebe o resultado. O desenho está entre os dois, e é uma decisão de produto, não de modelo.',
          },
        ],
      },
    ],
  },
  {
    id: 'chain',
    term: 'Compounding error',
    stage: 'chain',
    eyebrow: 'O primeiro custo',
    title: 'A ponte de tábuas',
    story:
      'Cada tábua da ponte aguenta bem sozinha. Vinte tábuas em sequência são outra conversa, e as do fim já estão rachadas antes de alguém pisar nelas.',
    lesson:
      'Confiabilidade por passo se comporta mal quando os passos são encadeados, porque as probabilidades se multiplicam. Isso explica um fenômeno observado: agentes de código funcionaram antes e melhor do que agentes de tarefas abertas. Não é porque programar é mais fácil, é porque testes, compiladores e verificadores de tipo elevam a confiabilidade por passo. Um passo ruim é pego imediatamente e corrigido, o que encurta a cadeia efetiva que precisa dar certo de ponta a ponta. A leitura prática disso é que a melhoria de maior alavancagem num agente costuma não ser um modelo melhor, mas um verificador barato: um teste, uma validação de schema, uma checagem que permita ao laço detectar o passo errado antes que ele contamine todos os seguintes.',
    blocks: [
      {
        type: 'meter',
        caption: 'Com 95 por cento de confiabilidade em cada passo',
        rows: [
          { label: '10 passos', detail: 'Sucesso de ponta a ponta', percent: 60 },
          { label: '20 passos', detail: 'Sucesso de ponta a ponta', percent: 36 },
        ],
      },
    ],
  },
  {
    id: 'workshop',
    term: 'Agent harness',
    stage: 'workshop',
    eyebrow: 'O segundo custo',
    title: 'A bancada faz metade do trabalho',
    story:
      'A lista pregada na parede antes de a primeira lasca cair. A folha de progresso que fica na bancada de um dia para o outro. E a corda amarrada no pé da mesa, para voltar quando algo dá errado.',
    lesson:
      'A tentação, quando um agente falha, é esperar o próximo modelo. Um experimento interno compartilhado pela Anthropic mostra por que esse costuma ser o diagnóstico errado: mesmo um modelo de fronteira rodando no Claude Agent SDK não conseguia construir uma aplicação web de qualidade de produção a partir de um prompt de alto nível. A solução foi estrutura, não capacidade. E o padrão vale além desse caso: agentes de longa duração precisam de decomposição imposta de fora, estado persistido fora da janela de contexto e um caminho de recuperação. Sem isso, autonomia prolongada tende a virar caminhada aleatória caríssima.',
    blocks: [
      {
        type: 'points',
        caption: 'As quatro peças do arcabouço',
        items: [
          {
            iconName: 'list-ordered',
            label: 'Um agente inicializador',
            text: 'Produz a lista de funcionalidades antes de qualquer código ser escrito.',
          },
          {
            iconName: 'code',
            label: 'Um agente de codificação',
            text: 'Trata uma funcionalidade por sessão, em vez de tentar tudo de uma vez.',
          },
          {
            iconName: 'file-text',
            label: 'Um arquivo de progresso',
            text: 'Viaja entre sessões, servindo como memória externa durável.',
          },
          {
            iconName: 'rotate-ccw',
            label: 'Um histórico de git',
            text: 'Os agentes podem usar para se recuperar quando algo dá errado.',
          },
        ],
      },
    ],
  },
  {
    id: 'crossroads',
    term: 'Workflow vs agent',
    stage: 'crossroads',
    eyebrow: 'O terceiro custo',
    title: 'Trilho ou mar aberto',
    story:
      'Na bifurcação, de um lado o trilho pintado e medido, do outro o mar. O mar leva mais longe, e ninguém sabe dizer, antes de sair, quantos dias vai levar.',
    lesson:
      'O último custo é o mais fácil de evitar e o mais frequentemente ignorado: muitos problemas simplesmente não precisam de um agente. O critério prático é escolher a solução mais simples que resolve o problema e só adicionar complexidade quando ela for necessária, o que às vezes significa não usar sistema agêntico nenhum. Se você consegue enumerar os passos de antemão, você tem um workflow, e forçá-lo a virar agente só adiciona risco. O agente se justifica quando o caminho depende genuinamente do que for descoberto no meio do processo, quando nem você nem o usuário sabem, no início, quantas voltas serão necessárias.',
    blocks: [
      {
        type: 'compare',
        caption: 'O que cada um entrega, e o que cobra por isso',
        columns: [
          {
            title: 'Workflow',
            iconName: 'list-tree',
            items: [
              'Previsibilidade e consistência',
              'Latência estável',
              'Custo estimável antes de rodar',
              'Depuração simples, porque o caminho é conhecido',
            ],
          },
          {
            title: 'Agente',
            iconName: 'compass',
            items: [
              'Flexibilidade diante do inesperado',
              'Latência que varia a cada execução',
              'Custo que só se conhece no fim',
              'Superfície de falha bem menos previsível',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'arc',
    term: 'Agentic spectrum',
    stage: 'arc',
    eyebrow: 'Fechando o arco',
    title: 'De lenha a menino, degrau por degrau',
    story:
      'Quatro degraus, e cada um só existe porque alguém acrescentou uma coisa ao anterior. O último é o único que o boneco alcançou por decidir alcançar.',
    lesson:
      'Dentro do laço, quatro passos se repetem, perceber, raciocinar, agir e observar, e a cada turno a saída do modelo escolhe entre resposta final, chamada de ferramenta, handoff e pensamento continuado. ReAct é a forma mais comum de preencher esse laço, e guardrails vivem em cada fronteira com o mundo externo. Os três custos reais são a confiabilidade que se degrada ao longo dos passos, o arcabouço que qualquer laço em produção exige, e a pergunta honesta de se um workflow não resolveria o mesmo problema mais barato.',
    blocks: [
      {
        type: 'ladder',
        caption: 'A progressão inteira, legível de baixo para cima',
        rungs: [
          { label: 'Chamada única: entra texto, sai texto' },
          { label: 'LLM aumentado', adds: 'ferramentas, recuperação e memória' },
          { label: 'Workflow', adds: 'encadeamento projetado por você' },
          { label: 'Agente', adds: 'controle de fluxo entregue ao modelo' },
        ],
      },
    ],
  },
  {
    id: 'sources',
    term: 'Referências',
    stage: 'boy',
    eyebrow: 'Para ir mais longe',
    title: 'De onde isso vem',
    story:
      'No fim ele virou menino de verdade, cortou os fios e foi ler por conta própria.',
    lesson:
      'Este resumo segue um artigo do ByteByteGo e a documentação de quem constrói esses sistemas todos os dias. Se alguma parte ficou apertada aqui, é nas fontes que ela está inteira.',
    blocks: [
      {
        type: 'links',
        caption: 'As fontes deste resumo',
        items: [
          {
            label: 'The Agent Loop: How AI Goes From Answering Questions to Doing Things',
            source: 'ByteByteGo, julho de 2026',
            href: 'https://blog.bytebytego.com/p/the-agent-loop-how-ai-goes-from-answering',
          },
          {
            label: 'Building effective agents',
            source: 'Anthropic Engineering',
            href: 'https://www.anthropic.com/research/building-effective-agents',
          },
          {
            label: 'Effective harnesses for long-running agents',
            source: 'Anthropic Engineering',
            href: 'https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents',
          },
          {
            label: 'Running agents',
            source: 'OpenAI Agents SDK',
            href: 'https://openai.github.io/openai-agents-python/running_agents/',
          },
          {
            label: 'Guardrails',
            source: 'OpenAI Agents SDK',
            href: 'https://openai.github.io/openai-agents-python/guardrails/',
          },
          {
            label: 'ReAct: Synergizing Reasoning and Acting in Language Models',
            source: 'arXiv',
            href: 'https://arxiv.org/abs/2210.03629',
          },
        ],
      },
    ],
  },
])
