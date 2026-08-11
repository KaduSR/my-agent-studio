// @ts-check
/**
 * The "how it works" narrative.
 *
 * The Pinocchio story is the frame because every builder step has a natural
 * counterpart in it, and the concept that is hardest to explain plainly,
 * Guard Rails, has the strongest image in the whole tale: the nose that grows
 * when he lies. A limit you cannot hide is easier to feel than to define.
 *
 * The LLM slide comes second on purpose. The opening one ends by saying that
 * what the user builds here is not the model, which immediately raises the
 * question of what the model is; answering it before step 1 is what makes the
 * nine steps read as configuration rather than as magic.
 *
 * That slide leans on the log that speaks before it is carved, which is in the
 * original tale: it already talks with no face, no name and no shape, and nobody
 * taught it. "Pre-trained" is exactly that, and the image says it without the
 * word. The alternative, a head that already knew the words, put the language
 * inside the puppet, which is where the user's own configuration goes.
 *
 * Pure data. The presentation in ui/keynote.js decides how to render it.
 */

/**
 * @typedef {Object} KeynoteSlide
 * @property {string} id
 * @property {import('../ui/puppet.js').PuppetStage} stage Which figure to draw.
 * @property {string} [eyebrow] Small label above the title.
 * @property {string} title
 * @property {string} story The analogy.
 * @property {string} lesson What it means for the user's agent.
 * @property {import('../agent/types.js').StepId} [step] The step this explains.
 */

/** @type {ReadonlyArray<KeynoteSlide>} */
export const KEYNOTE = Object.freeze([
  {
    id: 'intro',
    stage: 'wood',
    eyebrow: 'Antes de começar',
    title: 'O que é um agente?',
    story:
      'Gepeto esculpiu um boneco de madeira. Ali, parado na bancada, ele não sabia o que fazer, nem o que não fazer.',
    lesson:
      'Um agente de IA começa igual: capaz, mas sem direção. O que você vai montar aqui não é o modelo. É tudo o que diz a ele quem ser.',
  },
  {
    id: 'brain',
    stage: 'brain',
    eyebrow: 'A matéria-prima',
    title: 'A madeira já falava',
    story:
      'A lenha que Gepeto recebeu não era um pedaço de pau comum. Quando Mestre Cereja encostou o machado nela, ela reclamou em voz alta, ainda sem rosto, sem nome e sem nenhuma forma. Ninguém tinha ensinado nada a ela: a fala já vinha na madeira.',
    lesson:
      'Essa madeira é o LLM, o modelo de linguagem que serve de cérebro ao agente. Você não o ensina a falar, ele já chega assim: treinado em muito texto, capaz de escrever e raciocinar sobre quase qualquer assunto. E, como a lenha na bancada, ele não sabe quem é, para quem trabalha nem onde deve parar. Esculpir é o que falta, e é o que as nove etapas a seguir fazem.',
  },
  {
    id: 'identity',
    step: 'identity',
    stage: 'named',
    eyebrow: 'Etapa 1',
    title: 'Nome',
    story: 'A primeira coisa que Gepeto fez foi dar um nome: Pinóquio.',
    lesson:
      'Um nome transforma "um boneco" em "alguém". Por isso a primeira etapa não é técnica. Ela é o que faz você tratar o agente como um personagem, e não como um formulário.',
  },
  {
    id: 'objective',
    step: 'objective',
    stage: 'purpose',
    eyebrow: 'Etapa 2',
    title: 'Objetivo',
    story: 'Gepeto não queria um boneco. Ele pediu, olhando para uma estrela, um filho.',
    lesson:
      'O objetivo é o desejo que explica por que o agente existe. Sem ele, cada resposta é uma decisão solta. Com ele, todas apontam para o mesmo lugar.',
  },
  {
    id: 'soul',
    step: 'soul',
    stage: 'soul',
    eyebrow: 'Etapa 3',
    title: 'Soul',
    story:
      'A Fada Azul não deu instruções ao boneco. Deu vida, e com ela a capacidade de escolher.',
    lesson:
      'A Soul é a diferença entre um agente que segue ordens e um que age por princípio. É o que ele leva para toda conversa, mesmo quando ninguém disse o que fazer.',
  },
  {
    id: 'personality',
    step: 'personality',
    stage: 'personality',
    eyebrow: 'Etapa 4',
    title: 'Personalidade',
    story:
      'Pinóquio era curioso, impulsivo e fácil de convencer. Não era um defeito da magia: era quem ele era.',
    lesson:
      'Personalidade é como o agente fala e decide: o tom, o formato das respostas, quanto ele arrisca. Dois agentes com o mesmo objetivo entregam coisas diferentes por causa disso.',
  },
  {
    id: 'guardrails',
    step: 'rules',
    stage: 'guardrails',
    eyebrow: 'Etapa 5',
    title: 'Guard Rails',
    story:
      'O Grilo Falante ia no ombro dele como consciência. E quando Pinóquio mentia, o nariz crescia na frente de todo mundo.',
    lesson:
      'Guard Rails são os limites que não dão para esconder nem negociar. Diferente de preferências, eles valem mesmo quando é inconveniente, e mesmo quando alguém pede o contrário.',
  },
  {
    id: 'tools',
    step: 'tools',
    stage: 'tools',
    eyebrow: 'Etapa 6',
    title: 'Ferramentas',
    story:
      'Ele não nasceu sabendo nadar nem carregando uma lanterna. Sem isso, a barriga da baleia era o fim da linha.',
    lesson:
      'Aqui você declara o que o agente espera ter à mão: buscar na web, ler arquivos, rodar código. Boa vontade não substitui ferramenta.',
  },
  {
    id: 'knowledge',
    step: 'knowledge',
    stage: 'knowledge',
    eyebrow: 'Etapa 7',
    title: 'Conhecimento',
    story:
      'Gepeto vendeu o próprio casaco para comprar o livro escolar de Pinóquio. No caminho da escola, ele trocou o livro por um ingresso de circo.',
    lesson:
      'Conhecimento é o material que o agente deveria consultar antes de responder: boas práticas, guia de estilo, política interna. Sem ele, o agente responde com o que aprendeu em geral, não com o que vale aqui. Diferente da memória, isso não depende do que já foi conversado.',
  },
  {
    id: 'memory',
    step: 'memory',
    stage: 'memory',
    eyebrow: 'Etapa 8',
    title: 'Memória',
    story: 'Cada aventura ensinou algo a Pinóquio. A raposa só funcionou porque era a primeira vez.',
    lesson:
      'Memória é o que separa um agente que recomeça do zero de um que continua de onde parou. Você escolhe o que ele guarda e, principalmente, o que ele nunca guarda.',
  },
  {
    id: 'export',
    step: 'export',
    stage: 'export',
    eyebrow: 'Etapa 9',
    title: 'Exportar',
    story:
      'No fim, ele virou um menino de verdade. Cortou os fios e saiu pelo mundo, sem precisar mais da bancada.',
    lesson:
      'Exportar é isso: seu agente sai daqui como documentação pronta e vai trabalhar no Claude Code ou em qualquer outra ferramenta. Ele deixa de depender deste estúdio.',
  },
  {
    id: 'close',
    stage: 'boy',
    eyebrow: 'É a sua vez',
    title: 'Agora esculpe o seu',
    story:
      'Nove etapas, na ordem que você quiser. Nada é obrigatório além de um nome e um objetivo.',
    lesson:
      'Tudo fica salvo neste navegador enquanto você monta, e o Markdown do painel lateral se atualiza a cada escolha, então você vê o agente nascendo enquanto decide.',
  },
])
