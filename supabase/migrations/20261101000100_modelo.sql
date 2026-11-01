-- Área do Aluno CA — modelo de dados (Etapa 1)
-- Tudo gira em torno do aluno. Configurações e catálogo de broches são globais.

create extension if not exists citext;

-- Tipos -----------------------------------------------------------------------

create type public.papel as enum ('professor', 'aluno');
create type public.situacao_aluno as enum ('ativo', 'inativo', 'pausado');
create type public.plano_aluno as enum ('premium', 'light');
create type public.app_treino as enum ('mfit', 'treinoio');
create type public.tipo_anamnese as enum ('inicial', 'realinhamento');
create type public.status_anamnese as enum ('rascunho', 'concluida', 'revisada');
create type public.tipo_documento as enum ('plano_alimentar', 'ciclo', 'outro');
create type public.raridade_broche as enum ('comum', 'raro', 'epico', 'lendario');

-- Utilitário: atualizado_em automático ----------------------------------------

create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

-- Perfis (1 por usuário do login) --------------------------------------------

create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  papel public.papel not null default 'aluno',
  criado_em timestamptz not null default now()
);

-- Aluno -----------------------------------------------------------------------

create table public.alunos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  nome text not null,
  email citext not null unique,
  telefone text,
  nascimento date,
  situacao public.situacao_aluno not null default 'ativo',
  plano public.plano_aluno not null default 'premium',
  valor_contratado numeric(10, 2),
  forma_pagamento text,
  tempo_contratado text,
  inicio date,
  fim date,
  app_treino public.app_treino,
  app_treino_link text,
  dia_acompanhamento smallint check (dia_acompanhamento between 0 and 6), -- 0 = domingo
  objetivo text,
  nutricionista text,
  renovacao_plano_alimentar date,
  notion_page_id text unique,
  origem_id text unique, -- id no sistema antigo (GPT)
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger alunos_atualizado_em before update on public.alunos
  for each row execute function public.tocar_atualizado_em();

-- Contrato --------------------------------------------------------------------

create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  arquivo_path text, -- caminho no bucket privado "contratos"
  data date,
  assinado boolean not null default false,
  criado_em timestamptz not null default now()
);
create index on public.contratos (aluno_id);

-- Anamnese --------------------------------------------------------------------

create table public.anamneses (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  tipo public.tipo_anamnese not null default 'inicial',
  respostas jsonb not null default '{}'::jsonb, -- { etapa: { pergunta: resposta } }
  status public.status_anamnese not null default 'rascunho',
  criada_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  concluida_em timestamptz,
  revisada_em timestamptz
);
create index on public.anamneses (aluno_id);
create trigger anamneses_atualizado_em before update on public.anamneses
  for each row execute function public.tocar_atualizado_em();

-- Ciclo (8 semanas por padrão; pausas empurram o fim) -------------------------

create table public.ciclos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  numero integer not null default 1,
  inicio date not null,
  semanas smallint not null default 8 check (semanas between 1 and 52),
  pausado_desde date,
  dias_pausados integer not null default 0 check (dias_pausados >= 0),
  fim date generated always as (inicio + semanas * 7 + dias_pausados) stored,
  objetivo text,
  link_ciclo text,
  link_prontuario text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (aluno_id, numero)
);
create unique index ciclos_um_ativo_por_aluno on public.ciclos (aluno_id) where ativo;
create trigger ciclos_atualizado_em before update on public.ciclos
  for each row execute function public.tocar_atualizado_em();

-- Acompanhamento semanal ------------------------------------------------------

create table public.acompanhamentos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  ciclo_id uuid references public.ciclos (id) on delete set null,
  semana smallint,
  respostas jsonb not null default '{}'::jsonb, -- aderência, treinos, cardio, dor, sono, energia, recorde, dúvidas
  resposta_professor text,
  enviado_em timestamptz not null default now(),
  respondido_em timestamptz
);
create index on public.acompanhamentos (aluno_id, enviado_em desc);

-- Registro de evolução --------------------------------------------------------

create table public.registros_evolucao (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  data date not null default current_date,
  peso numeric(5, 2) check (peso is null or peso between 20 and 400),
  medidas jsonb, -- { cintura: 80, quadril: 100, ... } em cm
  foto_frente_path text,
  foto_lado_path text,
  foto_costas_path text,
  criado_em timestamptz not null default now()
);
create index on public.registros_evolucao (aluno_id, data desc);

-- Orientação da semana (aluno_id nulo = todos os alunos) ----------------------

create table public.orientacoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid references public.alunos (id) on delete cascade,
  grupo text,
  texto text not null,
  publicada_em timestamptz not null default now()
);
create index on public.orientacoes (aluno_id, publicada_em desc);

-- Documento (PDFs) ------------------------------------------------------------

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  tipo public.tipo_documento not null,
  titulo text,
  arquivo_path text not null, -- caminho no bucket privado "documentos"
  versao integer not null default 1,
  data date not null default current_date,
  criado_em timestamptz not null default now()
);
create index on public.documentos (aluno_id, tipo, data desc);

-- Gamificação -----------------------------------------------------------------

create table public.broches (
  codigo text primary key,
  nome text not null,
  categoria text not null check (categoria in ('execucao', 'evolucao', 'jornada')),
  raridade public.raridade_broche not null default 'comum',
  icone text not null default 'award', -- nome do ícone lucide
  descricao text,
  ordem smallint not null default 0
);

create table public.pontuacoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  acao text not null,
  pontos integer not null,
  data timestamptz not null default now()
);
create index on public.pontuacoes (aluno_id, data desc);

create table public.conquistas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  broche text not null references public.broches (codigo),
  desbloqueada_em timestamptz not null default now(),
  unique (aluno_id, broche)
);

-- Notificação -----------------------------------------------------------------

create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  destinatario uuid not null references auth.users (id) on delete cascade,
  tipo text not null,
  dados jsonb not null default '{}'::jsonb,
  criada_em timestamptz not null default now(),
  enviada_em timestamptz,
  lida_em timestamptz
);
create index on public.notificacoes (destinatario, criada_em desc);

-- Anotação interna (só o professor vê) ---------------------------------------

create table public.anotacoes_internas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  texto text not null,
  autor uuid references auth.users (id) on delete set null default auth.uid(),
  criada_em timestamptz not null default now()
);
create index on public.anotacoes_internas (aluno_id, criada_em desc);

-- Configuração (chave/valor) --------------------------------------------------

create table public.configuracoes (
  chave text primary key,
  valor jsonb not null,
  atualizado_em timestamptz not null default now()
);
create trigger configuracoes_atualizado_em before update on public.configuracoes
  for each row execute function public.tocar_atualizado_em();

-- Registro de alterações (quem mudou o quê e quando) -------------------------

create table public.registro_alteracoes (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro_id uuid,
  acao text not null,
  usuario uuid default auth.uid(),
  antes jsonb,
  depois jsonb,
  em timestamptz not null default now()
);
create index on public.registro_alteracoes (tabela, registro_id, em desc);

create or replace function public.registrar_alteracao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.registro_alteracoes (tabela, registro_id, acao, antes, depois)
  values (
    tg_table_name,
    coalesce((case when tg_op = 'DELETE' then old.id else new.id end), null),
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['alunos', 'contratos', 'anamneses', 'ciclos', 'acompanhamentos',
                           'registros_evolucao', 'orientacoes', 'documentos', 'anotacoes_internas']
  loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.registrar_alteracao()',
      t || '_auditoria', t);
  end loop;
end $$;
