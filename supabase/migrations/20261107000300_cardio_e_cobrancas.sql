-- Cardio do programa (calendário por semana do ciclo) e registro do que o aluno fez -----------
-- programas.cardio = { orientacoes: text, sessoes: [{ nome: "Quarta · corrida de qualidade", semanas: ["25min leves", ...] }] }
alter table public.programas add column if not exists cardio jsonb;

create table public.cardio_feitos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  programa_id uuid not null references public.programas (id) on delete cascade,
  semana smallint not null,
  sessao smallint not null,
  nome text not null,
  feito_em timestamptz not null default now(),
  minutos smallint,
  distancia_km numeric(5, 2),
  comentario text,
  unique (programa_id, semana, sessao)
);
create index on public.cardio_feitos (aluno_id, feito_em desc);
alter table public.cardio_feitos enable row level security;
revoke all on public.cardio_feitos from anon;
create policy "cardio: aluno os próprios" on public.cardio_feitos
  for all to authenticated using (aluno_id = public.meu_aluno_id()) with check (aluno_id = public.meu_aluno_id());
create policy "cardio: professor tudo" on public.cardio_feitos
  for all to authenticated using (public.eh_professor()) with check (public.eh_professor());

-- Tipo do aluno: consultoria (online), presencial (personal) ou os dois -----------------------
alter table public.alunos add column if not exists modalidade text not null default 'consultoria'
  check (modalidade in ('consultoria', 'presencial', 'ambos'));

-- Cobranças: parcelas a receber e o que já foi pago. Só o professor vê. -----------------------
create table public.cobrancas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  descricao text not null,
  valor numeric(10, 2) not null check (valor >= 0),
  vencimento date not null,
  pago_em date,
  forma text,
  parcela smallint,
  total_parcelas smallint,
  grupo uuid, -- parcelas criadas juntas
  calculo jsonb, -- aulas do personal: { aulas, valor_aula, aulas_ferias, pct_ferias, ajuste }
  observacao text,
  criado_em timestamptz not null default now()
);
create index on public.cobrancas (vencimento) where pago_em is null;
create index on public.cobrancas (aluno_id, vencimento);
alter table public.cobrancas enable row level security;
revoke all on public.cobrancas from anon;
create policy "cobrancas: professor tudo" on public.cobrancas
  for all to authenticated using (public.eh_professor()) with check (public.eh_professor());
