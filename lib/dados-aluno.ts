import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Aluno, AppsTreino, Ciclo, FaixaLiga } from "./tipos";
import { FAIXAS_PADRAO } from "./ligas";

const APPS_PADRAO: AppsTreino = {
  mfit: { nome: "MFit", web: "https://mfitpersonal.com.br", ios: null, android: null },
  treinoio: { nome: "treino.io", web: "https://treino.io", ios: null, android: null },
};

export type PainelAluno = {
  aluno: Aluno;
  ciclo: Ciclo | null;
  pontos: number;
  faixas: FaixaLiga[];
  apps: AppsTreino;
  conquistas: { broche: string; desbloqueada_em: string; nome: string; icone: string; raridade: string }[];
  orientacao: { texto: string; publicada_em: string } | null;
};

/** Tudo que o Início precisa. Funciona para o próprio aluno e para o professor (visão do aluno). */
export async function carregarPainelAluno(supabase: SupabaseClient, filtro: { alunoId?: string; userId?: string }): Promise<PainelAluno | null> {
  let consulta = supabase.from("alunos").select("*");
  consulta = filtro.alunoId ? consulta.eq("id", filtro.alunoId) : consulta.eq("user_id", filtro.userId!);
  const { data: aluno } = await consulta.maybeSingle<Aluno>();
  if (!aluno) return null;

  const [ciclo, pontos, config, conquistas, orientacao] = await Promise.all([
    supabase.from("ciclos").select("*").eq("aluno_id", aluno.id).eq("ativo", true).maybeSingle<Ciclo>(),
    supabase.from("pontuacoes").select("pontos").eq("aluno_id", aluno.id),
    supabase.from("configuracoes").select("chave, valor").in("chave", ["faixas_ligas", "apps_treino"]),
    supabase
      .from("conquistas")
      .select("broche, desbloqueada_em, broches(nome, icone, raridade)")
      .eq("aluno_id", aluno.id)
      .order("desbloqueada_em", { ascending: false })
      .limit(3),
    supabase
      .from("orientacoes")
      .select("texto, publicada_em")
      .or(`aluno_id.eq.${aluno.id},aluno_id.is.null`)
      .order("publicada_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const mapaConfig = Object.fromEntries((config.data ?? []).map((c) => [c.chave, c.valor]));

  return {
    aluno,
    ciclo: ciclo.data ?? null,
    pontos: (pontos.data ?? []).reduce((soma, p) => soma + (p.pontos ?? 0), 0),
    faixas: (mapaConfig.faixas_ligas as FaixaLiga[]) ?? FAIXAS_PADRAO,
    apps: { ...APPS_PADRAO, ...((mapaConfig.apps_treino as AppsTreino) ?? {}) },
    conquistas: (conquistas.data ?? []).map((c) => {
      const b = (Array.isArray(c.broches) ? c.broches[0] : c.broches) as { nome: string; icone: string; raridade: string } | null;
      return { broche: c.broche, desbloqueada_em: c.desbloqueada_em, nome: b?.nome ?? c.broche, icone: b?.icone ?? "award", raridade: b?.raridade ?? "comum" };
    }),
    orientacao: orientacao.data ?? null,
  };
}
