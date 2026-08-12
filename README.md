# My Agent Studio

Crie agentes de IA como você cria personagens.

Configure identidade, propósito, personalidade, regras, ferramentas e memória por
uma interface visual — e leve o resultado como Markdown pronto para usar no
Claude Code ou em qualquer outra ferramenta de agentes.

## O que é

Um aplicativo **100% estático**: HTML, CSS e JavaScript servidos como estão.

- **Sem build.** Os arquivos do repositório são exatamente os arquivos publicados.
- **Sem backend.** Nada é enviado para servidor nenhum.
- **Sem dependências de runtime.** Nem framework, nem biblioteca de ícones, nem
  gerador de ZIP — tudo é implementado sobre APIs nativas do navegador.

Seus agentes ficam no `localStorage` do seu navegador.

## Rodando localmente

O app usa ES modules nativos, que o navegador **não carrega via `file://`**
(bloqueio de CORS). É preciso servir por HTTP — qualquer servidor estático serve:

```bash
npx serve .          # http://localhost:3000
# ou
python -m http.server 8000
```

Não é necessário `npm install` para usar o aplicativo. As dependências de
desenvolvimento existem apenas para os testes e o type-check.

## Publicando no GitHub Pages

Como não há build, a publicação é direta:

```bash
git add .
git commit -m "..."
git push
```

O site está publicado em
**https://felipeaguiarcode.github.io/my-agent-studio/**, servido diretamente da
branch `main` (*Settings → Pages → Deploy from a branch* → `main` → `/ (root)`).

O arquivo `.nojekyll` já está no repositório. O roteamento usa hash
(`#/studio/new`), então links profundos funcionam sem nenhuma regra de rewrite
no servidor.

## Desenvolvimento

```bash
npm install          # apenas ferramentas de desenvolvimento
npm run dev          # servidor estático em http://localhost:4173
npm run typecheck    # TypeScript em modo strict sobre o JS anotado com JSDoc
npm run lint         # ESLint
npm test             # Vitest (unitários + componentes)
npm run test:e2e     # Playwright (requer: npx playwright install chromium)
npm run check        # typecheck + lint + testes
```

### Type-check sem TypeScript

O código é JavaScript puro, mas totalmente tipado por JSDoc. O `jsconfig.json`
liga `checkJs` com `strict`, então `npm run typecheck` faz a verificação
completa **sem emitir nada** — mantendo o rigor de tipos sem introduzir um passo
de build.

## Estrutura

```
index.html            Único HTML; todas as rotas vivem atrás do hash
css/                  tokens · base · layout · components · builder · preview
js/
  main.js             Bootstrap: shell, rotas, autosave
  router.js           #/  #/studio  #/studio/new  #/studio/:id
  agent/              Modelo, defaults, validação, Markdown, arquivos, exportação
  data/               Catálogos: etapas, tons, traços, ferramentas, avatares...
  lib/                dom · store · storage · zip · debounce · uuid · logger
  stores/             Estado do builder, biblioteca de agentes, autosave
  ui/                 Primitivas: cards, chips, slider, toast, dialog, paleta
  components/         Header, sidebar, preview, regras ordenáveis, cards
  steps/              As nove etapas
  team/               Modelo do time, defaults, Markdown, exportação
  views/              Home, biblioteca, builder, times, escritório
tests/                unit · component · e2e
```

### Princípio central

O objeto `Agent` é a **única fonte de verdade**. Markdown, `config.json` e a
árvore de arquivos exportada são sempre derivados dele, nunca armazenados. É por
isso que o preview pode ser regenerado a cada tecla digitada sem risco de
divergir do que será exportado.

## Começando um agente

**Criar novo agente** pergunta por onde começar:

- **Do zero**, com as nove etapas em branco.
- **A partir de um modelo**: são 42 agentes completos, com objetivo,
  personalidade, Guard Rails, ferramentas e memória já preenchidos, do revisor de
  código ao roteirista de stories. A home mostra seis; **Ver todos os modelos**
  abre a galeria, paginada de seis em seis, com setas, teclado, arrastar e os
  pontinhos de sempre.
- **Importando um JSON** exportado daqui, de outro navegador ou de outra pessoa.

## Ferramentas e comportamento

A etapa **Ferramentas** declara 26 ferramentas em seis categorias, com busca,
filtro por categoria e um alternador de "só as ativas". Cada uma que você liga
pergunta três coisas, nesta ordem: para que serve, **quanta liberdade tem**
(`Pergunta antes` · `Usa sozinho` · `Só leitura`) e o que evitar. A permissão é a
linha que um harness realmente obedece, então ela entra no documento exportado
antes dos cuidados de uso.

O que não está no catálogo você declara: **Adicionar ferramenta** cria uma
ferramenta sua, para um servidor MCP ou uma integração interna. Ela viaja no JSON
do agente como qualquer outra.

Um agente salvo antes de o catálogo crescer ganha as ferramentas novas
automaticamente, sem perder nada do que já estava configurado. Isso vive em um só
lugar, `js/agent/tool-catalogue.js`, usado tanto pela biblioteca quanto pela
importação.

A etapa **Memória** separa dois eixos que costumam ser confundidos. *Quanto ele
deve lembrar* é a retenção: sem memória, de sessão, persistente ou seletiva.
*Tipos de memória* é a forma: **janela de contexto**, **episódica**, **semântica**,
**procedimental** e **busca em base**. A janela vem marcada e não sai, porque não é
uma escolha: é o único lugar em que o modelo lê, e as outras quatro são maneiras
de trazer a coisa certa de volta para dentro dela na hora certa.

Em **Comportamento** (etapa Personalidade) são nove sliders, cinco perfis prontos
(Equilibrado, Criativo, Rigoroso, Executivo, Didático), um botão para voltar ao
padrão e uma frase que lê os nove de volta em português. Adicionar um slider é uma
entrada em `js/data/behavior-sliders.js`: defaults, validação, `config.json` e
importação leem todos de lá.

## Soul e conhecimento

A etapa **Soul** abre com sete **souls base** — Suporte Empático, Analista
Técnico, Tutor Socrático, Parceiro Criativo, Guardião Cauteloso, Consultor
Executivo, Construtor Pragmático. Um clique preenche missão, essência, filosofia e
valores, e tudo continua editável. É o mesmo gesto dos perfis de comportamento,
uma etapa antes, e vive em `js/data/soul-presets.js`. Um preset escreve só a Soul:
tom, traços e sliders continuam sendo escolha da etapa 4.

A etapa **Conhecimento** é o material de consulta que viaja com o agente — vale
para toda conversa e, diferente da memória, não depende do que já foi dito. São
até 12 documentos em Markdown, escritos no editor com prévia ao lado, ou vindos do
catálogo de **12 boas práticas prontas** em quatro categorias
(`js/data/knowledge-library.js`): de "anatomia de um bom pedido" e "citar fonte e
datar" a "segredos e instruções embutidas" e "quando chamar uma pessoa".

Adicionar do catálogo faz uma **cópia editável**, não uma assinatura: o documento
passa a ser seu e a origem fica registrada apenas como procedência. Os documentos
entram no prompt exportado numa seção `## Knowledge`, com os níveis de título
reajustados para aninhar corretamente, e saem também como arquivos: um por
documento em `references/` no kit do Claude Code, e um `knowledge.md` agregado no
kit genérico.

## Exportar

Os formatos estão em três famílias, porque respondem a perguntas diferentes:

| Família | Para quê |
| --- | --- |
| **Prompt de criação** | O texto pronto para colar no Claude Code, no ChatGPT ou no Gemini e já sair usando. |
| **Documento único** | Um `AGENT.md` com tudo dentro, para ler, anexar ou versionar. |
| **Kit para ferramentas** | A pasta completa: Generic Agent ou Claude Code, com um arquivo por tema. |

As ações acompanham a escolha: um prompt oferece copiar e baixar, um kit oferece
ZIP. O prompt não é só o documento com um cabeçalho: ele diz onde colar e manda o
modelo escrever o `CLAUDE.md`, ou assumir o personagem, conforme a ferramenta.

### JSON do agente ≠ `config.json`

A última etapa oferece os dois, e eles não são a mesma coisa:

| Arquivo | Para quê |
| --- | --- |
| `config.json` | Leitura por máquina: só as ferramentas ativas, regras como texto puro. |
| `<nome>.agent.json` | O estado editável inteiro, para reabrir no builder depois. |

Só o segundo volta sem perdas, e é ele que a importação aceita — além de tolerar
um `config.json` ou um agente cru, coagindo cada campo contra os catálogos do
app (`js/agent/transfer.js`). O botão fica disponível mesmo com o export ainda
bloqueado: um agente pela metade também merece backup.

## Times de agentes

Depois do segundo agente vem sempre a mesma pergunta: quem faz o quê, e quem
coordena. **Times de agentes** (`#/times`) é a tela onde ela é respondida. Um
time tem nome, objetivo e um escritório: os agentes que você já criou sentam em
mesas, cada um com o seu boneco pulando no próprio compasso sobre o piso
quadriculado. Os agentes entram pelo banco de **Agentes recentes**, logo abaixo
da sala, a um clique.

São **quatro formas de trabalhar**, e são as quatro que a trilha *Sistemas
agênticos* ensina:

| Modo | O que é |
| --- | --- |
| **Ordens diretas** | Você decide quem faz o quê antes de começar, e cada mesa ganha a sua ordem. É a paralelização. |
| **Linha de montagem** | A saída de cada mesa é a entrada da próxima, na ordem das mesas. É o encadeamento. |
| **Dupla de revisão** | Uns produzem, um avalia e devolve, e roda de novo até passar. É o avaliador-otimizador. |
| **Time com gerente** | Um agente recebe o objetivo, divide o trabalho e responde pelo resultado. É o orquestrador-trabalhador. |

A diferença é visível na tela, não só no rótulo, e cada modo é desenhado com a
figura que o explica.

**Ordens diretas** e **time com gerente** são uma sala: mesas sobre o piso
quadriculado, e no modo com gerente a mesa dele sozinha na cabeceira, com uma
linha descendo até as outras. Em ordens diretas cada boneco pula no seu compasso;
com gerente, **todos pulam juntos**.

**Linha de montagem** e **dupla de revisão** viram um fluxo, porque ali o trabalho
viaja de um agente para o outro e uma grade de mesas diria a coisa errada. O piso
vira uma malha de pontos, cada agente vira um nó com pontos de conexão nos dois
lados, e as setas entre eles carregam a palavra: `Entrada → começa em → 1 →
entrega para → 2 → … → pronto → Entregue`. Na dupla de revisão a seta que importa
é a de volta, tracejada por baixo da fileira: **devolve para corrigir**. É o laço
de feedback desenhado, não descrito.

A linha de montagem ainda numera as mesas e dá botões para reordenar, porque ali
a ordem das mesas é a ordem do trabalho.

No código esse papel se chama `leadId`, e não `managerId`, porque um avaliador não
gerencia ninguém: ele lê o que voltou e devolve.

Trocar de modo não apaga nada: o texto de cada mesa continua lá, só muda de
rótulo, de "Ordem" para "Etapa deste agente", "O que este agente produz" ou
"Especialidade no time". E ele começa **dobrado**, mostrando o que foi escrito
como uma linha, porque oito campos de texto abertos transformam uma sala num
formulário. Tirar o gerente do time deixa a cadeira vazia e bloqueia a exportação
com a razão escrita na tela, em vez de exportar um documento que mente.

### Times prontos

Para não começar de uma tela em branco, existem **três times prontos**, um por
formato que vale ver funcionando:

- **Time de Marketing** (com gerente): uma **Gerente de Marketing** na cabeceira,
  com **Social Media**, **Copywriter de Conversão** e **Editor de SEO** sentados.
- **Plantão de Qualidade** (linha de montagem): **Triador de Bugs**, **Analista de
  QA**, **Revisor de Código** e **Companheiro de Plantão**, nessa ordem.
- **Mesa de Revisão** (dupla de revisão): **Redator Técnico** e **Editor de SEO**
  produzem, **Guardião da Marca** avalia e devolve.
- **Time de Dados** (linha de montagem): **Mapeador de Dados**, **Engenheiro de
  Dados**, **Analista de Dados** e **Designer de Dashboards**. Da base que chegou
  ao painel, sem pular a conferência.
- **Time de Contabilidade** (linha de montagem): **Analista Contábil**, **Analista
  de Dados** e **Controller**. Do lançamento ao fechamento explicado.
- **Time Fiscal** (dupla de revisão): **Analista Fiscal** apura e **Revisor de
  Contratos** aponta o que gera obrigação; **Auditor Tributário** confere contra a
  norma e devolve.

Nenhum é maquete: os agentes são criados de verdade na sua biblioteca, editáveis
nas nove etapas como qualquer outro, e o time guarda referências a eles. Pedir um
exemplo duas vezes dá duas cópias independentes, do mesmo jeito que pedir um
modelo de agente duas vezes dá dois agentes.

O time guarda **referências** aos agentes, nunca cópias, porque o agente continua
sendo a única fonte de verdade. Isso tem uma consequência visível: se você
excluir um agente que estava sentado, a mesa dele vira uma **cadeira vazia** em
vez de sumir. Apagar a mesa apagaria junto a ordem que você escreveu ali, sem
avisar.

### Levar o time

A exportação principal é o **kit para Claude Code**: não uma descrição do time,
mas o time. É a pasta que você solta num projeto e abre:

```
time-de-conteudo/
  CLAUDE.md                    objetivo, elenco, o laço e a condição de parada
  .claude/agents/
    pesquisadora.md            um subagente por integrante, com front matter
    redator.md
    editora.md
  TEAM.md                      o time como documento único
  team.json                    a mesma configuração legível por máquina
  agents/*.json                o config de cada agente, para desmontar o time depois
```

Cada arquivo em `.claude/agents/` é um subagente de verdade, endereçável pelo
`name` do front matter: o documento completo do agente, mais uma seção **Role in
the team** que diz o que ele foi mandado fazer ali e a quem responde.

O `CLAUDE.md` é o que transforma um elenco em algo que roda. Ele traz o objetivo,
os passos de cada iteração e, principalmente, **quem decide parar**: no modo
gerente é o gerente, no modo de ordens é o fim da lista. O teto de 12 iterações
está lá como rede de segurança contra laço infinito e queima de token, e o
documento diz isso com todas as letras, porque tratar o teto como mecanismo de
parada é exatamente o erro que a trilha agêntica passa um slide desfazendo.

Também dá para levar o time como texto: **Copiar prompt** (pronto para colar) ou
**Copiar Markdown**. Nos dois, os agentes entram por referência: cada um já tem o
próprio documento, e embutir oito deles enterraria justamente aquilo que o
documento do time existe para dizer.

O botão **Pausar animação** existe porque a WCAG 2.2.2 pede uma forma de parar
movimento que começa sozinho e não termina. Quem tem "reduzir movimento" ligado
no sistema já encontra a sala parada.

## Como funciona (no app)

O botão **Como funciona?** na home abre um menu de duas trilhas. Escolher uma
faz o boneco do cartão voar para o palco: o FLIP é medido na figura do cartão,
então a escolha parece levantar o boneco de dentro dele. O botão **Trilhas** no
rodapé faz o caminho de volta, com o mesmo morph invertido.

**Meu primeiro agente** (12 slides) explica o que é um agente, o que é o LLM que
serve de cérebro a ele e cada uma das nove etapas, usando a história do Pinóquio:
de bloco de madeira a menino de verdade.

**Sistemas agênticos** (13 slides) sobe um nível e conta o que separa um modelo
que responde de um agente que executa: o modelo sem estado, o LLM aumentado, os
workflows, o laço e quem decide parar, os quatro passos de cada iteração, as
quatro decisões por turno, o ReAct, os guardrails nas três fronteiras e os três
custos reais da autonomia. É um resumo do artigo *The Agent Loop* (ByteByteGo,
jul/2026) mais a documentação da Anthropic e da OpenAI, com as fontes no último
slide. A marionete continua sendo a imagem: a virada para agente é o momento em
que o boneco tira a cruzeta da mão de Gepeto.

Em todo slide das duas trilhas, uma tag no canto superior direito diz o nome
técnico do assunto: `LLM`, `RAG`, `System prompt`, `Agent loop`, `ReAct`,
`Compounding error`, `Agent harness`. A história continua sendo o Pinóquio; a tag
é a palavra que a pessoa vai digitar numa busca depois.

O boneco tem vida própria em todas as cenas, com um repouso que espicha e
achata ao estilo Scribblenauts, e a trilha agêntica acrescenta doze cenários
próprios em `js/ui/puppet-scenes.js`: o trilho pintado, os três portões, a ponte
de tábuas, a bancada, a bifurcação, a escada. As transições usam FLIP sobre a
Web Animations API, então o efeito é idêntico em todos os navegadores.

Os slides da segunda trilha carregam blocos estruturados
(`js/ui/keynote-blocks.js`): tabela, traço ReAct, pseudocódigo do laço, barras de
confiabilidade, comparação, escada e fontes. Cada um entra em cascata; o que
repete para sempre é animação CSS, e não `element.animate()`, para que a regra
global de `prefers-reduced-motion` alcance e nada fique preso invisível.

Um slide que precisa de rolagem não é um slide, então os blocos ficam numa
terceira coluna ao lado do texto, e não embaixo dele: **figura, prosa,
estrutura**. A modal se dimensiona por trilha, não por slide (uma trilha tem
blocos em todos os slides ou em nenhum, então nada redimensiona no meio do
caminho): 1080x760 para a narrativa, 1240x880 para a agêntica. Nenhum dos 25
slides rola de 1024x700 para cima, e um teste e2e trava isso, porque a regressão
aqui é editorial: ninguém quebra nada ao acrescentar duas frases num parágrafo, o
deck só começa a rolar de novo. Abaixo de 1000px de largura tudo empilha numa
coluna, e aí a rolagem é o comportamento honesto.

## Dicionário do agente

O ícone de capelo, no canto direito da top bar, abre um dicionário para quem
está começando: **LLM, token, prompt, contexto, harness, ferramentas, base de
conhecimento, agente, agente ou automação e alucinação**. Cada verbete diz a
mesma coisa três vezes, em três registros: a definição sem jargão, a analogia
com o Pinóquio e onde aquilo aparece numa tarde de uso real. As figuras e a
animação são as mesmas do keynote, e o `harness` ganhou a cruzeta da marionete,
que é exatamente o que ele é: o que transforma intenção em movimento.

## Acessibilidade

Meta: WCAG 2.1 AA.

Toda a aplicação é operável por teclado, incluindo a reordenação das Guard Rails:
foque a alça, **Espaço** para pegar, **setas** para mover, **Espaço** para
soltar, **Esc** para cancelar. Cada movimento é anunciado por uma live region.

No keynote, no dicionário e na galeria de modelos, as setas ← → navegam,
`Home`/`End` vão para as pontas e `Esc` fecha. Na galeria, as páginas fora de vista ficam `inert`, para
o Tab não parar em um card que ninguém está vendo.

Quem tem "reduzir movimento" ligado no sistema recebe os slides sem o morph e o
boneco parado.

Atalhos: `Ctrl/Cmd + K` abre a busca.

## Licenças

A geometria dos ícones vem do [Lucide](https://lucide.dev) (ISC). Veja
[LICENSES.md](LICENSES.md).
