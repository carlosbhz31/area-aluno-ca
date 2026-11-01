-- Valores iniciais da especificação (ajustáveis pelo Carlos no painel)

insert into public.configuracoes (chave, valor) values
  ('regras_pontos', '{
     "acompanhamento_no_prazo": 5,
     "semana_100_treinos": 5,
     "registro_peso_medidas": 2,
     "fotos_fim_ciclo": 5,
     "anamnese_concluida": 5,
     "recorde_carga": 3,
     "acompanhamento_atrasado_3_dias": -1
   }'),
  -- Faixas de pontos: a definir pelo Carlos. Valores provisórios.
  ('faixas_ligas', '[
     {"liga": "Ferro", "min": 0},
     {"liga": "Bronze", "min": 30},
     {"liga": "Prata", "min": 80},
     {"liga": "Ouro", "min": 150},
     {"liga": "Platina", "min": 250},
     {"liga": "Diamante", "min": 400},
     {"liga": "Mestre", "min": 600}
   ]'),
  ('dia_padrao_acompanhamento', '1'),
  ('ranking_ativo', 'false'),
  -- Links dos apps de treino. Preencha as lojas quando quiser que o botão abra direto nelas.
  ('apps_treino', '{
     "mfit": {"nome": "MFit", "web": "https://mfitpersonal.com.br", "ios": null, "android": null},
     "treinoio": {"nome": "treino.io", "web": "https://treino.io", "ios": null, "android": null}
   }')
on conflict (chave) do nothing;

insert into public.broches (codigo, nome, categoria, raridade, icone, descricao, ordem) values
  ('primeiro_checkin',     'Primeiro check-in',          'execucao', 'comum',    'send',          'Enviou o primeiro acompanhamento.', 1),
  ('semana_perfeita',      'Semana perfeita',            'execucao', 'raro',     'flame',         'Fez 100% dos treinos da semana.', 2),
  ('quatro_semanas',       '4 semanas seguidas',         'execucao', 'raro',     'calendar-check','Quatro acompanhamentos seguidos no prazo.', 3),
  ('ciclo_completo',       'Ciclo completo',             'execucao', 'epico',    'trophy',        'Fechou as 8 semanas do ciclo.', 4),
  ('tres_ciclos',          '3 ciclos completos',         'execucao', 'lendario', 'crown',         'Três ciclos fechados.', 5),
  ('primeiro_peso',        'Primeiro registro de peso',  'evolucao', 'comum',    'scale',         'Registrou o peso pela primeira vez.', 6),
  ('recorde_carga',        'Recorde de carga',           'evolucao', 'raro',     'dumbbell',      'Bateu um recorde pessoal.', 7),
  ('fotos_ciclo',          'Fotos do ciclo enviadas',    'evolucao', 'comum',    'camera',        'Mandou as fotos de avaliação do ciclo.', 8),
  ('meta_ciclo',           'Meta do ciclo batida',       'evolucao', 'epico',    'target',        'Bateu a meta combinada do ciclo.', 9),
  ('anamnese_concluida',   'Anamnese concluída',         'jornada',  'comum',    'clipboard-check','Preencheu a anamnese.', 10),
  ('app_instalado',        'App instalado',              'jornada',  'comum',    'smartphone',    'Instalou o app e o atalho no celular.', 11),
  ('seis_meses',           '6 meses de consultoria',     'jornada',  'raro',     'medal',         'Seis meses com a gente.', 12),
  ('um_ano',               '1 ano de consultoria',       'jornada',  'lendario', 'gem',           'Um ano de consultoria.', 13),
  ('renovacao',            'Renovação',                  'jornada',  'epico',    'refresh-cw',    'Renovou a consultoria.', 14)
on conflict (codigo) do nothing;
