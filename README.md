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
  views/              Home, biblioteca, builder
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
- **A partir de um modelo**: são 35 agentes completos, com objetivo,
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

## Como funciona (no app)

O botão **Como funciona?** na home abre uma apresentação animada que explica o
que é um agente, o que é o LLM que serve de cérebro a ele e cada uma das nove
etapas, usando a história do Pinóquio: de bloco de madeira a menino de verdade.
O boneco tem vida própria em todas as cenas, com um repouso que espicha e
achata ao estilo Scribblenauts. As transições usam FLIP sobre a Web Animations
API, então o efeito é idêntico em todos os navegadores.

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
