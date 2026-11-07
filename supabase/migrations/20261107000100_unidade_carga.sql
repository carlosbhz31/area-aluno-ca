-- Unidade da carga escolhida pelo aluno em cada exercício (depende do aparelho)
alter table public.series_feitas
  add column if not exists unidade text not null default 'kg' check (unidade in ('kg', 'lb', 'barras'));
