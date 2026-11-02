export type AppTreino = "mfit" | "treinoio";
export type Situacao = "ativo" | "inativo" | "pausado";
export type Plano = "premium" | "light";

export type Aluno = {
  id: string;
  user_id: string | null;
  nome: string;
  email: string;
  telefone: string | null;
  nascimento: string | null;
  situacao: Situacao;
  plano: Plano;
  valor_contratado: number | null;
  forma_pagamento: string | null;
  tempo_contratado: string | null;
  inicio: string | null;
  fim: string | null;
  app_treino: AppTreino | null;
  app_treino_link: string | null;
  dia_acompanhamento: number | null;
  objetivo: string | null;
  nutricionista: string | null;
  renovacao_plano_alimentar: string | null;
  tem_nutricao: boolean;
  foto_perfil: string | null;
  termos_aceitos_em: string | null;
  termos_versao: string | null;
  notion_page_id: string | null;
  origem_id: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type Ciclo = {
  id: string;
  aluno_id: string;
  numero: number;
  inicio: string;
  semanas: number;
  pausado_desde: string | null;
  dias_pausados: number;
  fim: string;
  objetivo: string | null;
  link_ciclo: string | null;
  link_prontuario: string | null;
  ativo: boolean;
};

export type LinksApp = { nome: string; web: string; ios: string | null; android: string | null };
export type AppsTreino = Record<AppTreino, LinksApp>;
export type FaixaLiga = { liga: string; min: number };

export const NOME_APP: Record<AppTreino, string> = { mfit: "MFit", treinoio: "treino.io" };
export const NOME_PLANO: Record<Plano, string> = { premium: "Premium", light: "Light" };
export const NOME_SITUACAO: Record<Situacao, string> = { ativo: "Ativo", inativo: "Inativo", pausado: "Pausado" };
export const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
