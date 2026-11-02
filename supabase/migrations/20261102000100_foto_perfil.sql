-- Foto de perfil do aluno ------------------------------------------------------
-- O arquivo fica na pasta privada do aluno no bucket "fotos" (<aluno_id>/perfil-*.jpg);
-- o app grava aqui o caminho e gera links temporários para mostrar.
alter table public.alunos add column if not exists foto_perfil text;
