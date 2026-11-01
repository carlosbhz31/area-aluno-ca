-- Módulo Treino — Etapa 1: o aluno executa o treino dentro do app.
-- Programa (ficha do ciclo) > treinos (A, B, C...) > exercícios com a prescrição por semana do ciclo.
-- A pausa é avisada pelo servidor: o banco confere a cada 2 segundos e chama /api/pausas,
-- que manda o push. Assim o aviso chega com a tela bloqueada ou o app em segundo plano.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Programa de treino do aluno (um ativo por vez) ----------------------------------

create table public.programas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  ciclo_id uuid references public.ciclos (id) on delete set null,
  nome text not null,
  ativo boolean not null default true,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on public.programas (aluno_id);
create unique index programas_um_ativo on public.programas (aluno_id) where ativo;
create trigger programas_atualizado_em before update on public.programas
  for each row execute function public.tocar_atualizado_em();

create table public.treinos (
  id uuid primary key default gen_random_uuid(),
  programa_id uuid not null references public.programas (id) on delete cascade,
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  ordem smallint not null default 1,
  nome text not null,          -- "Treino A"
  foco text,                   -- "Peito, ombro e tríceps"
  observacoes text
);
create index on public.treinos (programa_id);
create index on public.treinos (aluno_id);

-- prescricao: lista de semanas [{series, min, max, pausa}]. Uma só = vale para o ciclo todo;
-- várias = uma por semana do ciclo (semana 1 na primeira posição).
create table public.exercicios_treino (
  id uuid primary key default gen_random_uuid(),
  treino_id uuid not null references public.treinos (id) on delete cascade,
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  ordem smallint not null default 1,
  nome text not null,
  grupo text,
  equipamento text,
  video_url text,
  observacoes text,
  metrica text not null default 'reps' check (metrica in ('reps', 'segundos')),
  aquecimento smallint not null default 0 check (aquecimento between 0 and 5),
  prescricao jsonb not null check (jsonb_typeof(prescricao) = 'array' and jsonb_array_length(prescricao) between 1 and 16)
);
create index on public.exercicios_treino (treino_id);
create index on public.exercicios_treino (aluno_id);

-- Execução: cada vez que o aluno faz um treino. "plano" guarda o treino como estava no dia.
create table public.execucoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  treino_id uuid references public.treinos (id) on delete set null,
  programa_id uuid references public.programas (id) on delete set null,
  semana smallint,
  nome_treino text not null,
  plano jsonb not null,
  iniciada_em timestamptz not null default now(),
  concluida_em timestamptz,
  esforco smallint check (esforco between 1 and 10),
  comentario text
);
create index on public.execucoes (aluno_id, iniciada_em desc);
create unique index execucoes_uma_aberta on public.execucoes (aluno_id) where concluida_em is null;

create table public.series_feitas (
  id uuid primary key default gen_random_uuid(),
  execucao_id uuid not null references public.execucoes (id) on delete cascade,
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  exercicio_id uuid not null, -- id do exercício no plano (pode já ter sido apagado da ficha)
  numero smallint not null,
  aquecimento boolean not null default false,
  carga numeric(6, 2),
  reps smallint,
  segundos smallint,
  feita_em timestamptz not null default now(),
  unique (execucao_id, exercicio_id, aquecimento, numero)
);
create index on public.series_feitas (aluno_id, exercicio_id, feita_em desc);

-- Pausas agendadas: só o servidor lê e grava -----------------------------------------

create table public.pausas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  execucao_id uuid not null references public.execucoes (id) on delete cascade,
  termina_em timestamptz not null,
  titulo text not null,
  corpo text not null,
  url text not null,
  enviada_em timestamptz,
  cancelada_em timestamptz,
  resultado text,
  criada_em timestamptz not null default now()
);
create index pausas_pendentes on public.pausas (termina_em) where enviada_em is null and cancelada_em is null;
create index on public.pausas (user_id);

-- Segurança ------------------------------------------------------------------------

alter table public.programas enable row level security;
alter table public.treinos enable row level security;
alter table public.exercicios_treino enable row level security;
alter table public.execucoes enable row level security;
alter table public.series_feitas enable row level security;
alter table public.pausas enable row level security;
revoke all on public.programas, public.treinos, public.exercicios_treino, public.execucoes, public.series_feitas from anon;
revoke all on public.pausas from anon, authenticated;

create policy "programas: aluno lê os próprios" on public.programas
  for select to authenticated using (aluno_id = public.meu_aluno_id());
create policy "programas: professor tudo" on public.programas
  for all to authenticated using (public.eh_professor()) with check (public.eh_professor());

create policy "treinos: aluno lê os próprios" on public.treinos
  for select to authenticated using (aluno_id = public.meu_aluno_id());
create policy "treinos: professor tudo" on public.treinos
  for all to authenticated using (public.eh_professor()) with check (public.eh_professor());

create policy "exercicios: aluno lê os próprios" on public.exercicios_treino
  for select to authenticated using (aluno_id = public.meu_aluno_id());
create policy "exercicios: professor tudo" on public.exercicios_treino
  for all to authenticated using (public.eh_professor()) with check (public.eh_professor());

create policy "execucoes: aluno lê as próprias" on public.execucoes
  for select to authenticated using (aluno_id = public.meu_aluno_id());
create policy "execucoes: aluno começa" on public.execucoes
  for insert to authenticated with check (aluno_id = public.meu_aluno_id() and concluida_em is null);
create policy "execucoes: aluno atualiza as próprias" on public.execucoes
  for update to authenticated using (aluno_id = public.meu_aluno_id()) with check (aluno_id = public.meu_aluno_id());
create policy "execucoes: aluno descarta a aberta" on public.execucoes
  for delete to authenticated using (aluno_id = public.meu_aluno_id() and concluida_em is null);
create policy "execucoes: professor tudo" on public.execucoes
  for all to authenticated using (public.eh_professor()) with check (public.eh_professor());

create policy "series: aluno lê as próprias" on public.series_feitas
  for select to authenticated using (aluno_id = public.meu_aluno_id());
create policy "series: aluno grava no treino aberto" on public.series_feitas
  for all to authenticated
  using (aluno_id = public.meu_aluno_id())
  with check (aluno_id = public.meu_aluno_id()
              and exists (select 1 from public.execucoes e where e.id = execucao_id and e.aluno_id = public.meu_aluno_id() and e.concluida_em is null));
create policy "series: professor tudo" on public.series_feitas
  for all to authenticated using (public.eh_professor()) with check (public.eh_professor());

create trigger programas_auditoria after insert or update or delete on public.programas
  for each row execute function public.registrar_alteracao();
create trigger treinos_auditoria after insert or update or delete on public.treinos
  for each row execute function public.registrar_alteracao();
create trigger exercicios_treino_auditoria after insert or update or delete on public.exercicios_treino
  for each row execute function public.registrar_alteracao();

-- Disparo das pausas -----------------------------------------------------------------

-- Reserva as pausas vencidas (cada uma sai uma vez só, mesmo com chamadas ao mesmo tempo).
create or replace function public.reservar_pausas()
returns setof public.pausas language sql security definer set search_path = public as $$
  update public.pausas set enviada_em = now()
  where id in (
    select id from public.pausas
    where enviada_em is null and cancelada_em is null and termina_em <= now() + interval '1 second'
    for update skip locked
  )
  returning *;
$$;
revoke execute on function public.reservar_pausas() from public, anon, authenticated;

-- Endereço da rota e segredo ficam no cofre do Supabase (nunca no Git).
create or replace function public.configurar_disparo_pausas(endereco text, segredo text)
returns void language plpgsql security definer set search_path = public, vault as $$
begin
  delete from vault.secrets where name in ('pausas_url', 'pausas_segredo');
  perform vault.create_secret(endereco, 'pausas_url');
  perform vault.create_secret(segredo, 'pausas_segredo');
end $$;
revoke execute on function public.configurar_disparo_pausas(text, text) from public, anon, authenticated;

-- Roda a cada 2 segundos; só chama o site quando há pausa vencendo.
create or replace function public.disparar_pausas()
returns void language plpgsql security definer set search_path = public as $$
declare
  endereco text;
  segredo text;
begin
  if not exists (
    select 1 from public.pausas
    where enviada_em is null and cancelada_em is null and termina_em <= now() + interval '1 second'
  ) then
    return;
  end if;
  select decrypted_secret into endereco from vault.decrypted_secrets where name = 'pausas_url';
  select decrypted_secret into segredo from vault.decrypted_secrets where name = 'pausas_segredo';
  if endereco is null or segredo is null then
    return;
  end if;
  perform net.http_post(
    url := endereco,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || segredo),
    timeout_milliseconds := 15000
  );
end $$;
revoke execute on function public.disparar_pausas() from public, anon, authenticated;

select cron.schedule('disparar-pausas', '2 seconds', 'select public.disparar_pausas()');
-- O histórico do agendador cresce rápido com 2 segundos: limpa todo dia.
select cron.schedule('limpar-historico-agendador', '0 7 * * *', $$delete from cron.job_run_details where end_time < now() - interval '1 day'$$);
