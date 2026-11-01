-- Etapa 4 — Anamnese no app, termos de privacidade e primeiro acesso guiado

-- Termos de uso e privacidade: aceite registrado com a versão do texto ------------------
alter table public.alunos
  add column termos_aceitos_em timestamptz,
  add column termos_versao text;

-- O aluno só consegue marcar o próprio aceite
create or replace function public.aceitar_termos(versao text)
returns void language sql security definer set search_path = public as $$
  update public.alunos set termos_aceitos_em = now(), termos_versao = left(versao, 20)
  where id = public.meu_aluno_id();
$$;
revoke execute on function public.aceitar_termos(text) from anon;

-- Anamnese: no máximo um rascunho aberto por aluno ---------------------------------------
create unique index anamneses_um_rascunho on public.anamneses (aluno_id) where status = 'rascunho';

-- Aluno não marca a própria anamnese como revisada nem mexe na data de revisão
drop policy "anamneses: aluno cria a própria" on public.anamneses;
create policy "anamneses: aluno cria a própria" on public.anamneses
  for insert to authenticated
  with check (aluno_id = public.meu_aluno_id() and status in ('rascunho', 'concluida') and revisada_em is null);
drop policy "anamneses: aluno edita enquanto não revisada" on public.anamneses;
create policy "anamneses: aluno edita enquanto não revisada" on public.anamneses
  for update to authenticated
  using (aluno_id = public.meu_aluno_id() and status <> 'revisada')
  with check (aluno_id = public.meu_aluno_id() and status in ('rascunho', 'concluida') and revisada_em is null);

-- Broches do "comece aqui": cada passo vale uma conquista ---------------------------------
insert into public.broches (codigo, nome, categoria, raridade, icone, descricao, ordem) values
  ('termos_aceitos', 'Combinado feito',     'jornada', 'comum', 'handshake', 'Aceitou os termos e começou a jornada.', 9),
  ('app_treino',     'App de treino pronto', 'jornada', 'comum', 'dumbbell', 'Instalou o app de treino.', 10),
  ('avisos_ligados', 'Avisos ligados',      'jornada', 'comum', 'bell-ring', 'Ativou os avisos no celular.', 11)
on conflict (codigo) do nothing;
update public.broches set descricao = 'Colocou o app na tela inicial do celular.', nome = 'Atalho no celular'
  where codigo = 'app_instalado';

-- Jornada na ordem do "comece aqui"
update public.broches b set ordem = o.ordem
from (values ('termos_aceitos', 10), ('anamnese_concluida', 11), ('app_treino', 12), ('app_instalado', 13),
             ('avisos_ligados', 14), ('seis_meses', 15), ('um_ano', 16), ('renovacao', 17)) as o (codigo, ordem)
where b.codigo = o.codigo;
