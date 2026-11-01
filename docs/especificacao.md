# Especificação — Área do Aluno CA (v1)

31/10/2026 · Carlos Alberto (Consultoria Premium CA)

## Objetivo

Um único sistema web com dois lados: a **Área do Aluno**, onde cada aluno acompanha a consultoria com clareza e motivação, e o **Painel do Professor**, o CRM do Carlos para cadastrar, acompanhar e supervisionar os alunos. Na v1 ele roda ao lado da base "Gestão de Clientes" do Notion, que continua sendo a principal; quando o sistema estiver confiável, ele substitui o Notion.

- **Para o aluno:** saber em que semana do ciclo está, o que fazer agora, abrir o app de treino com um toque (MFit ou treino.io), enviar o acompanhamento semanal, registrar peso e fotos, ver o plano alimentar em PDF e sentir a evolução por pontos, ligas e conquistas.
- **Para o Carlos:** ver quem precisa de atenção, ter a ficha completa de cada aluno (cadastro, contrato, anamnese, ciclos, acompanhamentos, evolução) e receber avisos do que mudou.
- **Referências:** a Área do Aluno CA feita no ChatGPT (estrutura e regras, 16 alunos já cadastrados) e a Central Fraktal do Murilo Amorim (padrão de interface, experiência e gamificação).

## Acesso e privacidade

Cada aluno vê só os próprios dados; só o Carlos vê todos. A anamnese tem dados de saúde, então segurança não é opcional na v1.

| Perfil | Quem | O que acessa |
| --- | --- | --- |
| Professor (admin) | Carlos | Tudo: alunos, fichas, anamneses, acompanhamentos, configurações |
| Aluno | Cada aluno cadastrado | Apenas o próprio painel, anamnese, acompanhamentos, evolução, PDFs e conquistas |
| Colaboradora (fase 2) | Isabela | Leitura do CRM e fila semanal, sem editar metodologia |

- **Login:** por e-mail com link mágico (sem senha para o aluno decorar). O aluno só entra se o Carlos tiver cadastrado aquele e-mail.
- **Instalável no celular (PWA):** atalho na tela inicial do iPhone e Android, com notificações.
- **Arquivos privados:** fotos, contratos e PDFs ficam em armazenamento privado, com links temporários; nada público na internet.
- **LGPD:** aceite de termo de uso e privacidade no primeiro acesso, com opção de exportar ou excluir os dados do aluno a pedido.
- **Registro de alterações:** quem mudou o quê e quando nas fichas (para supervisão e para desfazer erros).

## Área do Aluno

A tela inicial responde em 3 segundos: em que semana estou, o que faço agora e como estou indo. O resto fica a um toque.

| Tela | O que mostra | Ações do aluno |
| --- | --- | --- |
| Início | Saudação, semana do ciclo (ex.: Semana 6 de 8) com barra, "seu próximo passo", liga e pontos, últimas conquistas, aviso da semana 7 | Abrir o próximo passo, abrir o app de treino |
| Meu treino (atalho) | Botão para o app configurado na ficha: MFit ou treino.io; no celular abre o app instalado ou a loja | Abrir o app |
| Acompanhamento semanal | Formulário do check-in no dia combinado (aderência, treinos feitos, cardio, dores, sono, energia, dúvidas) e histórico dos envios com a resposta do Carlos | Enviar check-in, ler resposta |
| Evolução | Gráfico de peso, medidas e fotos por data (frente, lado, costas), comparativo antes/depois | Registrar peso, medidas e fotos |
| Meu plano | Ciclo atual (datas, objetivo, organização semanal), orientações da semana publicadas pelo Carlos, contrato e datas da consultoria | Ler, baixar documentos |
| Nutrição | PDF do plano alimentar enviado pelo Carlos (elaborado com a nutricionista parceira Marina) | Visualizar e baixar o PDF |
| Conquistas e liga | Liga atual, pontos, broches conquistados e bloqueados, como ganhar pontos | Ver progresso |
| Anamnese | Questionário inicial e de realinhamento, salvo por etapas | Preencher e atualizar |

**Primeiro acesso guiado ("comece aqui"):** aceitar os termos, preencher a anamnese, instalar o app de treino e o atalho no celular, ativar notificações. Cada passo concluído vale uma conquista.

**Fora da v1:** execução do treino com timer dentro do sistema (fica no MFit ou treino.io) e chat com a nutricionista.

## Gamificação

O jogo premia constância, não estética: pontos vêm do que o aluno controla (treinar, enviar o acompanhamento, registrar evolução), no mesmo modelo de ligas e broches da Central Fraktal. Valores iniciais abaixo, ajustáveis pelo Carlos no painel.

| Ação | Pontos |
| --- | --- |
| Enviar o acompanhamento semanal no prazo | +5 |
| Cumprir 100% dos treinos planejados da semana (informado no check-in) | +5 |
| Registrar peso ou medidas na semana | +2 |
| Enviar fotos de avaliação no fim do ciclo | +5 |
| Concluir a anamnese (inicial ou de realinhamento) | +5 |
| Recorde pessoal de carga informado no check-in | +3 |
| Acompanhamento atrasado mais de 3 dias | -1 |

**Ligas:** Ferro, Bronze, Prata, Ouro, Platina, Diamante e Mestre, com faixas de pontos definidas pelo Carlos. Quem sobe de liga fica protegido até o fim da semana; uma semana ruim não derruba ninguém na hora.

**Broches** (ícone, raridade comum/raro/épico/lendário, data de desbloqueio; conquistado é para sempre):

- Execução: Primeiro check-in, Semana perfeita, 4 semanas seguidas, Ciclo completo (8 semanas), 3 ciclos completos.
- Evolução: Primeiro registro de peso, Recorde de carga, Fotos do ciclo enviadas, Meta do ciclo batida.
- Jornada: Anamnese concluída, App instalado, 6 meses de consultoria, 1 ano de consultoria, Renovação.

**Ranking entre alunos:** desligado por padrão (privacidade e perfis diferentes); o Carlos pode ligar como competição opcional, mostrando só primeiro nome.

**Moeda (tipo frakcoins):** fase 2, só se houver o que trocar (ex.: bônus, material extra).

## Painel do Professor (CRM)

A primeira tela do Carlos é uma fila de trabalho: quem precisa de algo hoje, em ordem de urgência. O cadastro completo fica na ficha.

| Tela | O que tem |
| --- | --- |
| Hoje / Fila da semana | Acompanhamentos recebidos sem resposta, acompanhamentos atrasados, anamneses para revisar, ciclos que entram na semana 7, renovações nos próximos 30 dias, alunos sem registro há mais de 10 dias |
| Alunos | Lista com busca e filtros (situação, plano Premium/Light, "precisa de atenção", app de treino), indicadores (ativos, inativos, em revisão) |
| Ficha do aluno | Cadastro (dados, plano, valor, forma de pagamento, datas de início e fim, renovação), app de treino (MFit ou treino.io + link individual opcional), contrato anexado, anamneses com histórico, ciclos (datas, objetivo, semana atual, link do PDF do ciclo e do prontuário no Drive), acompanhamentos com resposta, evolução (peso, medidas, fotos), plano alimentar em PDF, pontos e conquistas, anotações internas, linha do tempo de tudo |
| Conferência do cadastro | Checklist de entrada que já existe no sistema do GPT: plataforma de treino, datas, contrato, anamnese concluída, anamnese revisada, primeiro acesso |
| Visão do aluno | Botão para ver exatamente o que o aluno vê |
| Responder acompanhamento | Resposta escrita ao check-in (com sugestão gerada pelo Claude na voz do Carlos, editável), marcação de pontos de atenção |
| Publicar orientações | Texto da semana para um aluno ou grupo, que aparece no Início e gera notificação |
| Planos nutricionais | Upload do PDF por aluno, com data e versão |
| Configurações | Regras de pontos e ligas, dia padrão do acompanhamento, textos padrão, modelos de anamnese |

**Supervisão:** indicadores por aluno e gerais (taxa de envio do acompanhamento, aderência média, semanas seguidas, alunos em risco de abandono), para agir antes da reavaliação.

**Fora da v1:** montar e prescrever treinos dentro do sistema (continua no Claude + MFit) e cobrança automática.

## Notificações

Poucas e úteis: cada aviso pede uma ação. Push no celular (PWA instalado) e e-mail como reserva; o aluno escolhe os horários silenciosos.

| Gatilho | Para quem | Canal |
| --- | --- | --- |
| Dia do acompanhamento chegou | Aluno | Push |
| Acompanhamento atrasado 2 dias | Aluno | Push + e-mail |
| Carlos respondeu o acompanhamento | Aluno | Push |
| Nova orientação da semana ou novo PDF | Aluno | Push |
| Entrou na semana 7 (avisar o Carlos) | Aluno e Carlos | Push |
| Conquista ou nova liga | Aluno | Push (no app) |
| Acompanhamento recebido | Carlos | Resumo diário por e-mail |
| Anamnese preenchida, renovação em 30 dias, aluno sem registro há 10 dias | Carlos | Resumo diário por e-mail |

No iPhone, push de site só funciona com o atalho instalado na tela inicial (iOS 16.4 ou mais novo), por isso o "comece aqui" ensina a instalar.

## Visual e experiência

O padrão é a Central Fraktal: menu lateral escuro por áreas, cartões claros, barras de progresso, cores com significado e ícones nos broches. Por cima, a identidade da Consultoria Premium CA.

- **Celular primeiro:** o aluno usa no celular. No celular o menu vira barra inferior com 4 ou 5 itens (Início, Acompanhamento, Evolução, Conquistas, Mais). No computador, menu lateral como na Fraktal. O painel do professor é pensado para computador.
- **Início em cartões:** semana do ciclo + barra, próximo passo em destaque, liga e pontos, atalho do treino, última conquista.
- **Identidade:** cores e logo da CA (só ícone, sóbrio, sem pessoas), tipografia limpa, estilo das artes aprovadas no Canva. Sem cara de sistema corporativo.
- **Linguagem:** voz do Carlos, curta e próxima, sem tom de coach. Referências leves ao universo de jogos (fases, ligas, conquistas) sem caricatura.
- **Estados vazios bem resolvidos:** nada de texto corrido ou página sem layout (problema do sistema atual); cada tela vazia diz o que fazer para preenchê-la.
- **Modo claro e escuro.**

## Modelo de dados

Tudo gira em torno do aluno: cada tabela abaixo pertence a um aluno, menos as de configuração.

| Tabela | Campos principais |
| --- | --- |
| Aluno | nome, e-mail (login), telefone, nascimento, situação (ativo/inativo/pausado), plano (Premium/Light), valor contratado, forma de pagamento, início, fim, app de treino (mfit/treinoio), link individual do app, dia do acompanhamento, id da página no Notion |
| Contrato | aluno, arquivo, data, assinado (sim/não) |
| Anamnese | aluno, tipo (inicial/realinhamento), respostas por etapa, status (rascunho/concluída/revisada), datas |
| Ciclo | aluno, número, início, fim (início + 56 dias), objetivo, semana atual (calculada), link do ciclo e do prontuário no Drive, ativo |
| Acompanhamento | aluno, semana, respostas (aderência, treinos feitos, cardio, dor, sono, energia, recorde, dúvidas), resposta do Carlos, datas de envio e resposta |
| Registro de evolução | aluno, data, peso, medidas, fotos (frente/lado/costas) |
| Orientação | aluno ou grupo, texto, data de publicação |
| Documento | aluno, tipo (plano alimentar, ciclo, outro), arquivo, versão, data |
| Pontuação | aluno, ação, pontos, data (extrato; a liga é calculada) |
| Conquista | aluno, broche, data de desbloqueio |
| Notificação | destinatário, tipo, enviada, lida |
| Anotação interna | aluno, texto, data (só o professor vê) |
| Configuração | regras de pontos, faixas das ligas, catálogo de broches, modelos de anamnese e acompanhamento |

## Migração dos dados

A exportação do sistema do GPT funcionou em 31/10/2026, mas ele tem pouco conteúdo real: o que vale trazer é o cadastro dos 16 alunos e as configurações de cada um. O arquivo fica fora do repositório (tem dados pessoais), no Drive do Carlos em `Trabalho > Documentos > Area do Aluno CA > export-area-aluno-ca-2026-10-31.json` (750 KB). Peça o arquivo ao Carlos na hora de importar; nunca faça commit dele.

| O que veio | Quantidade | Vai para o sistema novo? |
| --- | --- | --- |
| Alunos (nome, e-mail, plano, situação, objetivo, notas) | 16 | Sim |
| Configurações por aluno (app de treino, datas do contrato, início e semanas do ciclo, pausa, dia do acompanhamento, nutricionista, renovação do plano alimentar) | 16 | Sim |
| App de treino configurado | 14 MFit, 1 treino.io, 1 vazio | Sim |
| Fichas de treino do módulo de treino do GPT | 17 | Não na v1 (treino fica no MFit/treino.io); guardar no arquivo |
| Sessões de treino registradas (pilotos) | 49 | Não na v1; guardar no arquivo |
| Registros de peso | 1 | Sim |
| Anamneses enviadas | 0 | Nada a migrar |
| Fotos, acompanhamentos, contratos, planos alimentares | 0 | Nada a migrar |

Estrutura do arquivo: `students[]` (id, fullName, email, plan, status, mainGoal, notes, trainingKey, isPilot, paused, ended, nutrition, renewalDue…) e `details[<id>]` com `dashboard.profile.settings` (platform, trainingUrl, nutrition, nutritionist, nutritionRenewal, contractStart, contractEnd, cycleStart, cycleWeeks, cyclePaused, cyclePauseDate, cyclePausedDays, weeklyNote, checkinDay, contactUrl), `dashboard.profile.intake`, `dashboard.entries` (registros, ex.: peso), `fiches` e `history`.

**Notion "Gestão de Clientes" (26 registros):** importar no início para completar o cadastro (valor, forma de pagamento, datas, status, dados do MFit) e guardar o id da página de cada aluno. Na v1 o Notion continua sendo a fonte principal; quando houver diferença entre os dois, vale o Notion. A troca definitiva acontece quando o Carlos aprovar.

**Drive:** os ciclos e prontuários continuam em `Trabalho > Alunos > Ativos`; o sistema guarda só o link.

## Arquitetura e etapas

Um app web instalável no celular, com banco de dados e login gerenciados, publicado na internet com domínio próprio. Sugestão de partida (o Claude Code pode propor outra se justificar): Next.js na Vercel, Supabase (banco Postgres, login por e-mail, arquivos privados, região São Paulo) e Resend para e-mail. Os planos gratuitos cobrem o começo com 16 alunos; o custo só aparece com uso maior ou domínio próprio.

```
Aluno (celular, PWA) ──atalho──> MFit ou treino.io
        │
        ▼
App web Área do Aluno CA  <──── Carlos (painel do professor, computador)
        │
        ├── Supabase (banco, login, arquivos)
        ├── E-mail e push (avisos e resumo diário)
        ├── Notion (cadastro principal na v1)
        └── Google Drive (ciclos e prontuários, só link)
```

1. **Etapa 1 — Base (1 semana):** repositório no GitHub, login do Carlos e dos alunos, importação dos 16 alunos e do Notion, ficha do aluno, Início do aluno com semana do ciclo e atalho do app de treino. Piloto: Carlos e Isabela.
2. **Etapa 2 — Rotina semanal:** acompanhamento semanal (envio e resposta), evolução (peso, medidas, fotos), plano alimentar em PDF, orientações da semana, fila "Hoje" do professor.
3. **Etapa 3 — Jogo e avisos:** pontos, ligas, broches, notificações push e e-mail, resumo diário do Carlos.
4. **Etapa 4 — Abrir para todos:** anamnese no app, termos de privacidade, teste com 2 ou 3 alunos, depois todos.
5. **Depois:** troca do Notion pelo sistema, acesso da Isabela, execução do treino com timer, moeda do jogo.

Cada etapa termina com o Carlos testando no próprio celular antes de seguir.
