-- Etapa 3 — Jogo e avisos

-- Pontos: cada ação conta uma vez só (referência = acompanhamento, semana ou ciclo) --------
alter table public.pontuacoes add column referencia text;
create unique index pontuacoes_uma_vez on public.pontuacoes (aluno_id, acao, referencia) where referencia is not null;

-- Horário silencioso do aluno (sem push nesse intervalo; o aviso fica no app) ----------
alter table public.alunos
  add column silencio_inicio smallint not null default 22 check (silencio_inicio between 0 and 23),
  add column silencio_fim smallint not null default 7 check (silencio_fim between 0 and 23);

-- O aluno pode mudar só o próprio horário silencioso
create or replace function public.mudar_silencio(hora_inicio smallint, hora_fim smallint)
returns void language sql security definer set search_path = public as $$
  update public.alunos set silencio_inicio = hora_inicio, silencio_fim = hora_fim
  where id = public.meu_aluno_id() and hora_inicio between 0 and 23 and hora_fim between 0 and 23;
$$;
revoke execute on function public.mudar_silencio(smallint, smallint) from anon;

-- Inscrições de notificação no celular (Web Push) ---------------------------------------
create table public.inscricoes_push (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  aparelho text,
  criada_em timestamptz not null default now()
);
create index on public.inscricoes_push (user_id);
alter table public.inscricoes_push enable row level security;
revoke all on public.inscricoes_push from anon;

create policy "push: cada um vê as suas" on public.inscricoes_push
  for select to authenticated using (user_id = auth.uid());
create policy "push: cada um cadastra as suas" on public.inscricoes_push
  for insert to authenticated with check (user_id = auth.uid());
create policy "push: cada um apaga as suas" on public.inscricoes_push
  for delete to authenticated using (user_id = auth.uid());

-- Notificações: referência para não mandar o mesmo aviso duas vezes ----------------------
alter table public.notificacoes add column referencia text;
create unique index notificacoes_uma_vez on public.notificacoes (destinatario, tipo, referencia) where referencia is not null;
