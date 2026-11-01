-- Novo papel. Fica sozinho nesta migração: o Postgres não deixa usar um valor de enum
-- na mesma transação em que ele foi criado.
alter type public.papel add value if not exists 'nutricionista';
