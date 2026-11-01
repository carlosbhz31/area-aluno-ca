-- Link de cadastro: o professor gera, o aluno preenche os próprios dados.
-- O id é o código do link (aleatório, uso único, vence em 14 dias).
-- Só o professor lê e cria; a página pública usa o servidor (chave de serviço) para conferir o código.

create table public.convites_cadastro (
  id uuid primary key default gen_random_uuid(),
  rotulo text,                                   -- para o professor lembrar de quem é (ex.: "Ana do Instagram")
  plano public.plano_aluno not null default 'premium',
  valor_contratado numeric(10, 2),
  app_treino public.app_treino,
  tem_nutricao boolean not null default false,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '14 days',
  usado_em timestamptz,
  aluno_id uuid references public.alunos (id) on delete set null
);
create index on public.convites_cadastro (criado_em desc);

alter table public.convites_cadastro enable row level security;
revoke all on public.convites_cadastro from anon;

create policy "convites: professor tudo" on public.convites_cadastro
  for all to authenticated using (public.eh_professor()) with check (public.eh_professor());
