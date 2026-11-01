-- Etapa 2 — Rotina semanal: acompanhamento, reavaliação da semana 7, nutrição, evolução.

-- Nutrição: só quem tem plano alimentar vê a área -------------------------------

alter table public.alunos add column tem_nutricao boolean not null default false;

-- Acompanhamento: resposta lida, ponto de atenção, um por semana do ciclo ----------

alter table public.acompanhamentos
  add column resposta_lida_em timestamptz,
  add column atencao boolean not null default false;

create unique index acompanhamentos_um_por_semana
  on public.acompanhamentos (aluno_id, ciclo_id, semana) where ciclo_id is not null;

-- O aluno só marca a resposta como lida (não mexe em mais nada)
create or replace function public.marcar_resposta_lida(acompanhamento uuid)
returns void language sql security definer set search_path = public as $$
  update public.acompanhamentos set resposta_lida_em = now()
  where id = acompanhamento and aluno_id = public.meu_aluno_id()
    and resposta_professor is not null and resposta_lida_em is null;
$$;
revoke execute on function public.marcar_resposta_lida(uuid) from anon;

-- O envio do aluno precisa ser do ciclo dele
drop policy "acompanhamentos: aluno envia o próprio" on public.acompanhamentos;
create policy "acompanhamentos: aluno envia o próprio" on public.acompanhamentos
  for insert to authenticated
  with check (
    aluno_id = public.meu_aluno_id()
    and resposta_professor is null and respondido_em is null and atencao = false
    and (ciclo_id is null or exists (select 1 from public.ciclos c where c.id = ciclo_id and c.aluno_id = public.meu_aluno_id()))
  );

-- Reavaliação da semana 7: o aluno escolhe call ou WhatsApp -----------------------

create type public.formato_reavaliacao as enum ('call', 'whatsapp');

create table public.reavaliacoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  ciclo_id uuid not null references public.ciclos (id) on delete cascade,
  formato public.formato_reavaliacao not null,
  escolhido_em timestamptz not null default now(),
  unique (ciclo_id)
);
create index on public.reavaliacoes (aluno_id);

alter table public.reavaliacoes enable row level security;
revoke all on public.reavaliacoes from anon;

create policy "reavaliacoes: aluno lê a própria" on public.reavaliacoes
  for select to authenticated using (aluno_id = public.meu_aluno_id());
create policy "reavaliacoes: aluno escolhe" on public.reavaliacoes
  for insert to authenticated
  with check (aluno_id = public.meu_aluno_id()
              and exists (select 1 from public.ciclos c where c.id = ciclo_id and c.aluno_id = public.meu_aluno_id()));
create policy "reavaliacoes: aluno muda de ideia" on public.reavaliacoes
  for update to authenticated
  using (aluno_id = public.meu_aluno_id()) with check (aluno_id = public.meu_aluno_id());
create policy "reavaliacoes: professor tudo" on public.reavaliacoes
  for all to authenticated using (public.eh_professor()) with check (public.eh_professor());

create trigger reavaliacoes_auditoria after insert or update or delete on public.reavaliacoes
  for each row execute function public.registrar_alteracao();

-- Fotos da evolução: o aluno só grava arquivo de imagem na própria pasta -----------

drop policy "fotos: aluno envia na própria pasta" on storage.objects;
create policy "fotos: aluno envia na própria pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos'
              and (storage.foldername(name))[1] = public.meu_aluno_id()::text
              and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp'));

update storage.buckets set file_size_limit = 10485760, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
  where id = 'fotos';
update storage.buckets set file_size_limit = 20971520, allowed_mime_types = array['application/pdf']
  where id = 'documentos';

-- Configurações novas (o Carlos preenche no painel) --------------------------------

insert into public.configuracoes (chave, valor) values
  ('whatsapp_carlos', 'null'),
  ('link_agenda', 'null')
on conflict (chave) do nothing;
