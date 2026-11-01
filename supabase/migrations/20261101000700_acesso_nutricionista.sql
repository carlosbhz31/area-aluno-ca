-- Acesso da nutricionista: vê só o nome de quem tem plano alimentar e cuida dos PDFs desses alunos.
-- Não lê a tabela de alunos (valores, contatos), nem check-ins, fotos, anamneses ou endereço.

create or replace function public.eh_nutricionista()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and papel = 'nutricionista');
$$;
revoke execute on function public.eh_nutricionista() from anon;

-- Aluno atendido pela nutrição (ativo ou pausado, com plano alimentar)
create or replace function public.aluno_da_nutricao(aluno uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.alunos a where a.id = aluno and a.tem_nutricao and a.situacao <> 'inativo');
$$;
revoke execute on function public.aluno_da_nutricao(uuid) from anon;

-- Lista enxuta para a tela da nutricionista (só nome e ciclo; nada de contrato ou contato)
create or replace function public.alunos_da_nutricao()
returns table (id uuid, nome text, nutricionista text, renovacao_plano_alimentar date)
language sql stable security definer set search_path = public as $$
  select a.id, a.nome, a.nutricionista, a.renovacao_plano_alimentar
  from public.alunos a
  where (public.eh_nutricionista() or public.eh_professor()) and a.tem_nutricao and a.situacao <> 'inativo'
  order by a.nome;
$$;
revoke execute on function public.alunos_da_nutricao() from anon;

-- Documentos: só plano alimentar dos alunos da nutrição
create policy "documentos: nutricionista lê planos" on public.documentos
  for select to authenticated
  using (public.eh_nutricionista() and tipo = 'plano_alimentar' and public.aluno_da_nutricao(aluno_id));
create policy "documentos: nutricionista publica planos" on public.documentos
  for insert to authenticated
  with check (public.eh_nutricionista() and tipo = 'plano_alimentar' and public.aluno_da_nutricao(aluno_id));

-- Arquivos: pasta do aluno no bucket "documentos", só PDF
create policy "documentos: nutricionista envia PDF" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documentos' and public.eh_nutricionista()
              and public.aluno_da_nutricao(((storage.foldername(name))[1])::uuid)
              and lower(storage.extension(name)) = 'pdf');
create policy "documentos: nutricionista lê PDF" on storage.objects
  for select to authenticated
  using (bucket_id = 'documentos' and public.eh_nutricionista()
         and public.aluno_da_nutricao(((storage.foldername(name))[1])::uuid));
