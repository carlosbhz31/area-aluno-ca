-- Anotações / lembretes por exercício (ajuste do banco, posicionamento...). Uma por aluno e exercício,
-- vale em todos os ciclos. O aluno e o professor podem escrever.
create table public.anotacoes_exercicio (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  chave text not null, -- id do exercício na lista (biblioteca) ou o nome normalizado
  nome text not null,
  texto text not null default '',
  atualizado_por text not null default 'aluno' check (atualizado_por in ('aluno', 'professor')),
  atualizado_em timestamptz not null default now(),
  unique (aluno_id, chave)
);

alter table public.anotacoes_exercicio enable row level security;
revoke all on public.anotacoes_exercicio from anon;

create policy "anotacoes: aluno as próprias" on public.anotacoes_exercicio
  for all to authenticated using (aluno_id = public.meu_aluno_id()) with check (aluno_id = public.meu_aluno_id());
create policy "anotacoes: professor tudo" on public.anotacoes_exercicio
  for all to authenticated using (public.eh_professor()) with check (public.eh_professor());
