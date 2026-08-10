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
  steps/              As oito etapas
  views/              Home, biblioteca, builder
tests/                unit · component · e2e
```

### Princípio central

O objeto `Agent` é a **única fonte de verdade**. Markdown, `config.json` e a
árvore de arquivos exportada são sempre derivados dele, nunca armazenados. É por
isso que o preview pode ser regenerado a cada tecla digitada sem risco de
divergir do que será exportado.

## Acessibilidade

Meta: WCAG 2.1 AA.

Toda a aplicação é operável por teclado, incluindo a reordenação das Hard Rules:
foque a alça, **Espaço** para pegar, **setas** para mover, **Espaço** para
soltar, **Esc** para cancelar. Cada movimento é anunciado por uma live region.

Atalhos: `Ctrl/Cmd + K` abre a busca.

## Licenças

A geometria dos ícones vem do [Lucide](https://lucide.dev) (ISC). Veja
[LICENSES.md](LICENSES.md).
