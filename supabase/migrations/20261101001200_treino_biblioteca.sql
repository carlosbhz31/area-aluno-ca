-- Módulo Treino — Etapa 2: lista de exercícios do professor (com o vídeo do YouTube) e superset.

create table public.exercicios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  grupo text,
  equipamento text,
  video_url text,
  metrica text not null default 'reps' check (metrica in ('reps', 'segundos')),
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index exercicios_nome_unico on public.exercicios (lower(nome));
create trigger exercicios_atualizado_em before update on public.exercicios
  for each row execute function public.tocar_atualizado_em();
create trigger exercicios_auditoria after insert or update or delete on public.exercicios
  for each row execute function public.registrar_alteracao();

alter table public.exercicios enable row level security;
revoke all on public.exercicios from anon;
create policy "exercicios biblioteca: professor tudo" on public.exercicios
  for all to authenticated using (public.eh_professor()) with check (public.eh_professor());

-- Cada exercício da ficha aponta para a lista (o vídeo trocado lá vale para todas as fichas).
-- superset = true: faz junto com o exercício seguinte, alternando as séries, sem pausa entre eles.
alter table public.exercicios_treino
  add column exercicio_id uuid references public.exercicios (id) on delete set null,
  add column superset boolean not null default false;
create index on public.exercicios_treino (exercicio_id);
