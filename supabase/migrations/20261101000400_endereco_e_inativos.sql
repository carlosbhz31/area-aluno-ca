-- Endereço e dados para nota fiscal (só o professor vê) e bloqueio de alunos inativos.

-- Auditoria passa a aceitar tabelas cuja chave é aluno_id ------------------------

create or replace function public.registrar_alteracao()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  linha jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.registro_alteracoes (tabela, registro_id, acao, antes, depois)
  values (
    tg_table_name,
    coalesce(linha ->> 'id', linha ->> 'aluno_id')::uuid,
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

-- Dados privados: tabela separada para o aluno não conseguir ler nem pela API ---

create table public.dados_privados (
  aluno_id uuid primary key references public.alunos (id) on delete cascade,
  cpf text,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text check (uf is null or uf ~ '^[A-Z]{2}$'),
  atualizado_em timestamptz not null default now()
);

create trigger dados_privados_atualizado_em before update on public.dados_privados
  for each row execute function public.tocar_atualizado_em();

create trigger dados_privados_auditoria after insert or update or delete on public.dados_privados
  for each row execute function public.registrar_alteracao();

alter table public.dados_privados enable row level security;
revoke all on public.dados_privados from anon;

create policy "dados privados: só professor" on public.dados_privados
  for all to authenticated using (public.eh_professor()) with check (public.eh_professor());

-- Aluno inativo não enxerga nada (o login também é bloqueado pelo app) ----------
-- O cadastro e todo o histórico continuam guardados; ao reativar, volta tudo.

create or replace function public.meu_aluno_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.alunos where user_id = auth.uid() and situacao <> 'inativo';
$$;

drop policy "alunos: aluno lê o próprio" on public.alunos;
create policy "alunos: aluno lê o próprio" on public.alunos
  for select to authenticated using (user_id = auth.uid() and situacao <> 'inativo');
