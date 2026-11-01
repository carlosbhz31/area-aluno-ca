# Área do Aluno CA

Sistema da Consultoria Premium Carlos Alberto: área do aluno e painel do professor (CRM).

- Especificação: [docs/especificacao.md](docs/especificacao.md)
- Como configurar e publicar: [docs/configuracao.md](docs/configuracao.md)

## Stack

Next.js 15 (App Router) + TypeScript + Tailwind 4 · Supabase (Postgres, login por link mágico, arquivos privados, região São Paulo) · Vercel · Resend (SMTP do login).

## Estrutura

```
app/(aluno)/            Início, Acompanhamento, Evolução, Conquistas, Mais (celular primeiro)
app/professor/          Lista de alunos, ficha, novo aluno, visão do aluno (computador)
app/entrar, app/auth/   Login por link mágico ou código
components/             Cartões, barras, menus, Início do aluno
lib/                    Supabase, sessão, cálculo da semana do ciclo, ligas
supabase/migrations/    Tabelas, regras de segurança (RLS), valores iniciais
scripts/                Importação do sistema antigo e do Notion, definir professor
```

## Privacidade

- Cada aluno só lê os próprios dados (regras no banco). Anotações internas só o professor vê.
- Fotos, contratos e PDFs em armazenamento privado, com links temporários.
- Dados reais de alunos nunca entram no Git: `dados/`, `export-*.json` e `.env*` estão no `.gitignore`.
