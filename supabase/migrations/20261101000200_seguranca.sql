-- Área do Aluno CA — regras de segurança (RLS)
-- Regra de ouro: o aluno só lê os próprios dados; o professor lê e edita tudo.
-- Pontos e conquistas só o servidor grava (o aluno não consegue se dar pontos).

-- Funções auxiliares (security definer para não cair em recursão de RLS) -----

create or replace function public.eh_professor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and papel = 'professor');
$$;

create or replace function public.meu_aluno_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.alunos where user_id = auth.uid();
$$;

revoke execute on function public.eh_professor() from anon;
revoke execute on function public.meu_aluno_id() from anon;

-- Novo usuário do login: cria o perfil e liga ao cadastro do aluno pelo e-mail -

create or replace function public.ao_criar_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, papel) values (new.id, 'aluno')
  on conflict (id) do nothing;

  update public.alunos set user_id = new.id
  where email = new.email::citext and user_id is null;

  return new;
end $$;

create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.ao_criar_usuario();

-- E o caminho inverso: aluno cadastrado depois do usuário do login já existir
create or replace function public.ligar_aluno_ao_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is null then
    select id into new.user_id from auth.users where email::citext = new.email limit 1;
  end if;
  return new;
end $$;

create trigger alunos_ligar_usuario before insert or update of email on public.alunos
  for each row execute function public.ligar_aluno_ao_usuario();

-- Liga RLS em tudo ------------------------------------------------------------

alter table public.perfis              enable row level security;
alter table public.alunos              enable row level security;
alter table public.contratos           enable row level security;
alter table public.anamneses           enable row level security;
alter table public.ciclos              enable row level security;
alter table public.acompanhamentos     enable row level security;
alter table public.registros_evolucao  enable row level security;
alter table public.orientacoes         enable row level security;
alter table public.documentos          enable row level security;
alter table public.broches             enable row level security;
alter table public.pontuacoes          enable row level security;
alter table public.conquistas          enable row level security;
alter table public.notificacoes        enable row level security;
alter table public.anotacoes_internas  enable row level security;
alter table public.configuracoes       enable row level security;
alter table public.registro_alteracoes enable row level security;

-- Visitante sem login não acessa nada
revoke all on all tables in schema public from anon;

-- Perfis: cada um lê o seu; ninguém muda o próprio papel ----------------------

create policy "perfil: ler o próprio" on public.perfis
  for select to authenticated using (id = auth.uid() or public.eh_professor());

-- Alunos ----------------------------------------------------------------------

create policy "alunos: aluno lê o próprio" on public.alunos
  for select to authenticated using (user_id = auth.uid());
create policy "alunos: professor tudo" on public.alunos
  for all to authenticated using (public.eh_professor()) with check (public.eh_professor());

-- Tabelas do aluno: aluno lê as próprias linhas, professor faz tudo ----------

do $$
declare t text;
begin
  foreach t in array array['contratos', 'anamneses', 'ciclos', 'acompanhamentos',
                           'registros_evolucao', 'documentos', 'pontuacoes', 'conquistas']
  loop
    execute format(
      'create policy %L on public.%I for select to authenticated
         using (aluno_id = public.meu_aluno_id())',
      t || ': aluno lê as próprias', t);
    execute format(
      'create policy %L on public.%I for all to authenticated
         using (public.eh_professor()) with check (public.eh_professor())',
      t || ': professor tudo', t);
  end loop;
end $$;

-- O que o aluno pode gravar (usado a partir da Etapa 2) ----------------------

create policy "acompanhamentos: aluno envia o próprio" on public.acompanhamentos
  for insert to authenticated
  with check (aluno_id = public.meu_aluno_id() and resposta_professor is null and respondido_em is null);

create policy "evolucao: aluno registra o próprio" on public.registros_evolucao
  for insert to authenticated with check (aluno_id = public.meu_aluno_id());
create policy "evolucao: aluno corrige o próprio" on public.registros_evolucao
  for update to authenticated
  using (aluno_id = public.meu_aluno_id()) with check (aluno_id = public.meu_aluno_id());

create policy "anamneses: aluno cria a própria" on public.anamneses
  for insert to authenticated
  with check (aluno_id = public.meu_aluno_id() and status in ('rascunho', 'concluida'));
create policy "anamneses: aluno edita enquanto não revisada" on public.anamneses
  for update to authenticated
  using (aluno_id = public.meu_aluno_id() and status <> 'revisada')
  with check (aluno_id = public.meu_aluno_id() and status in ('rascunho', 'concluida'));

-- Orientações: individuais ou para todos -------------------------------------

create policy "orientacoes: aluno lê as suas e as gerais" on public.orientacoes
  for select to authenticated
  using (aluno_id = public.meu_aluno_id() or (aluno_id is null and public.meu_aluno_id() is not null));
create policy "orientacoes: professor tudo" on public.orientacoes
  for all to authenticated using (public.eh_professor()) with check (public.eh_professor());

-- Notificações: cada um vê e marca como lida as suas -------------------------

create policy "notificacoes: ler as próprias" on public.notificacoes
  for select to authenticated using (destinatario = auth.uid() or public.eh_professor());
create policy "notificacoes: marcar como lida" on public.notificacoes
  for update to authenticated using (destinatario = auth.uid()) with check (destinatario = auth.uid());
create policy "notificacoes: professor tudo" on public.notificacoes
  for all to authenticated using (public.eh_professor()) with check (public.eh_professor());

-- Anotações internas e registro de alterações: só o professor ----------------

create policy "anotacoes: só professor" on public.anotacoes_internas
  for all to authenticated using (public.eh_professor()) with check (public.eh_professor());

create policy "auditoria: professor lê" on public.registro_alteracoes
  for select to authenticated using (public.eh_professor());

-- Catálogo e configurações: todos logados leem, professor edita --------------

create policy "broches: logados leem" on public.broches
  for select to authenticated using (true);
create policy "broches: professor edita" on public.broches
  for all to authenticated using (public.eh_professor()) with check (public.eh_professor());

create policy "configuracoes: logados leem" on public.configuracoes
  for select to authenticated using (true);
create policy "configuracoes: professor edita" on public.configuracoes
  for all to authenticated using (public.eh_professor()) with check (public.eh_professor());

-- Arquivos privados -----------------------------------------------------------
-- Caminho padrão: <aluno_id>/<arquivo>. Nada é público; o app gera links temporários.

insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', false), ('documentos', 'documentos', false), ('contratos', 'contratos', false)
on conflict (id) do nothing;

create policy "arquivos: professor tudo" on storage.objects
  for all to authenticated
  using (bucket_id in ('fotos', 'documentos', 'contratos') and public.eh_professor())
  with check (bucket_id in ('fotos', 'documentos', 'contratos') and public.eh_professor());

create policy "arquivos: aluno lê a própria pasta" on storage.objects
  for select to authenticated
  using (bucket_id in ('fotos', 'documentos', 'contratos')
         and (storage.foldername(name))[1] = public.meu_aluno_id()::text);

create policy "fotos: aluno envia na própria pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = public.meu_aluno_id()::text);
