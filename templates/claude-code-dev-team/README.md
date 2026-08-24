# Claude Code Development Team

Template de equipe para desenvolvimento de software com Claude Code.

## Agentes

| Agente | Responsabilidade principal |
|---|---|
| Tech Lead | arquitetura, coordenação e decisões técnicas |
| QA Engineer | testes, qualidade e regressão |
| Backend Engineer | APIs, serviços, dados e integrações |
| Frontend Engineer | interface funcional, estado e performance |
| UX/UI Designer | experiência, interface e acessibilidade |
| Project Analyst & Documentation | requisitos, rastreabilidade e documentação |
| Code Reviewer | revisão independente e qualidade do código |
| Devil's Advocate | contestação, riscos e alternativas |

## Instalação no projeto

Copie `CLAUDE.md` para a raiz do projeto e `.claude/agents/*.md` para `.claude/agents/`.

```bash
mkdir -p .claude/agents
cp templates/claude-code-dev-team/CLAUDE.md ./CLAUDE.md
cp templates/claude-code-dev-team/.claude/agents/*.md ./.claude/agents/
```

Se preferir usar apenas o template, copie a pasta inteira para um projeto novo e ajuste o `CLAUDE.md` ao contexto específico.

## Uso

A sessão principal deve assumir a coordenação. Para cada tarefa, carregue somente os especialistas necessários. Não acione todos os agentes indiscriminadamente.

Fluxo recomendado:

`Analista/Docs → UX/UI → Tech Lead → Backend/Frontend → QA → Reviewer → Devil's Advocate → Tech Lead`

Para tarefas puramente backend, por exemplo, UX/UI pode ser omitido.

## Princípio de independência

QA, Reviewer e Devil's Advocate devem manter uma postura independente. O agente que implementou uma solução não deve ser a única autoridade sobre sua qualidade.
