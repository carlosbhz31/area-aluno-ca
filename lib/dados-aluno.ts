import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Aluno, AppsTreino, Ciclo, FaixaLiga } from "./tipos";
import { FAIXAS_PADRAO } from "./ligas";
import { prazoDaSemana, type PrazoSemana } from "./acompanhamento";
import { hojeEmBH } from "./ciclo";

const APPS_PADRAO: AppsTreino = {
  mfit: { nome: "MFit", web: "https://mfitpersonal.com.br", ios: null, android: null },
  treinoio: { nome: "treino.io", web: "https://treino.io", ios: null, android: null },
};

/** Segunda-feira 00h desta semana (horário de BH), em ISO. */
function inicioDaSemana() {
  const hoje = hojeEmBH();
  const d = new Date(hoje + "T03:00:00Z"); // 00h em BH
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString();
}

export type Contato ={ whatsapp: string | null; agenda: string | null };

export type PainelAluno = {
  aluno: Aluno;
  ciclo: Ciclo | null;
  pontos: number;
  pontosInicioSemana: number;
  faixas: FaixaLiga[];
  apps: AppsTreino;
  conquistas: { broche: string; desbloqueada_em: string; nome: string; icone: string; raridade: string }[];
  orientacao: { texto: string; publicada_em: string } | null;
  diaAcompanhamento: number;
  prazo: PrazoSemana;
  enviadoNaSemana: boolean;
  respostaNova: { id: string; semana: number | null } | null;
  reavaliacao: "call" | "whatsapp" | null;
  contato: Contato;
  /** Primeiro acesso ("comece aqui"): situação da anamnese e broches da jornada já ganhos. */
  jornada: { anamnese: "nenhuma" | "rascunho" | "feita"; broches: string[] };
};

/** Tudo que o Início precisa. Funciona para o próprio aluno e para o professor (visão do aluno). */
export async function carregarPainelAluno(supabase: SupabaseClient, filtro: { alunoId?: string; userId?: string }): Promise<PainelAluno | null> {
  let consulta = supabase.from("alunos").select("*");
  consulta = filtro.alunoId ? consulta.eq("id", filtro.alunoId) : consulta.eq("user_id", filtro.userId!);
  const { data: aluno } = await consulta.maybeSingle<Aluno>();
  if (!aluno) return null;

  const umaSemanaAtras = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [ciclo, pontos, config, conquistas, orientacao, respondido, anamneses, jornada] = await Promise.all([
    supabase.from("ciclos").select("*").eq("aluno_id", aluno.id).eq("ativo", true).maybeSingle<Ciclo>(),
    supabase.from("pontuacoes").select("pontos, data").eq("aluno_id", aluno.id),
    supabase.from("configuracoes").select("chave, valor").in("chave", ["faixas_ligas", "apps_treino", "dia_padrao_acompanhamento", "whatsapp_carlos", "link_agenda"]),
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
      .gte("publicada_em", umaSemanaAtras)
      .order("publicada_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("acompanhamentos")
      .select("id, semana")
      .eq("aluno_id", aluno.id)
      .not("resposta_professor", "is", null)
      .is("resposta_lida_em", null)
      .order("respondido_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("anamneses").select("status").eq("aluno_id", aluno.id),
    supabase.from("conquistas").select("broche").eq("aluno_id", aluno.id).in("broche", ["termos_aceitos", "app_treino", "app_instalado", "avisos_ligados"]),
  ]);
  const statusAnamneses = (anamneses.data ?? []).map((a) => a.status);

  const mapaConfig = Object.fromEntries((config.data ?? []).map((c) => [c.chave, c.valor]));
  const cicloAtivo = ciclo.data ?? null;
  const diaAcompanhamento = aluno.dia_acompanhamento ?? Number(mapaConfig.dia_padrao_acompanhamento ?? 1);
  const prazo = prazoDaSemana(cicloAtivo, diaAcompanhamento);

  let enviadoNaSemana = false;
  let reavaliacao: PainelAluno["reavaliacao"] = null;
  if (cicloAtivo) {
    const [envio, reav] = await Promise.all([
      prazo.tipo === "ativo"
        ? supabase.from("acompanhamentos").select("id", { count: "exact", head: true }).eq("ciclo_id", cicloAtivo.id).eq("semana", prazo.semana)
        : Promise.resolve({ count: 0 }),
      supabase.from("reavaliacoes").select("formato").eq("ciclo_id", cicloAtivo.id).maybeSingle(),
    ]);
    enviadoNaSemana = (envio.count ?? 0) > 0;
    reavaliacao = (reav.data?.formato as PainelAluno["reavaliacao"]) ?? null;
  }

  return {
    aluno,
    ciclo: cicloAtivo,
    pontos: (pontos.data ?? []).reduce((soma, p) => soma + (p.pontos ?? 0), 0),
    pontosInicioSemana: (pontos.data ?? []).filter((p) => Date.parse(p.data) < Date.parse(inicioDaSemana())).reduce((soma, p) => soma + (p.pontos ?? 0), 0),
    faixas: (mapaConfig.faixas_ligas as FaixaLiga[]) ?? FAIXAS_PADRAO,
    apps: { ...APPS_PADRAO, ...((mapaConfig.apps_treino as AppsTreino) ?? {}) },
    conquistas: (conquistas.data ?? []).map((c) => {
      const b = (Array.isArray(c.broches) ? c.broches[0] : c.broches) as { nome: string; icone: string; raridade: string } | null;
      return { broche: c.broche, desbloqueada_em: c.desbloqueada_em, nome: b?.nome ?? c.broche, icone: b?.icone ?? "award", raridade: b?.raridade ?? "comum" };
    }),
    orientacao: orientacao.data ?? null,
    diaAcompanhamento,
    prazo,
    enviadoNaSemana,
    respostaNova: respondido.data ?? null,
    reavaliacao,
    contato: { whatsapp: (mapaConfig.whatsapp_carlos as string | null) || null, agenda: (mapaConfig.link_agenda as string | null) || null },
    jornada: {
      anamnese: statusAnamneses.some((st) => st !== "rascunho") ? "feita" : statusAnamneses.length ? "rascunho" : "nenhuma",
      broches: (jornada.data ?? []).map((c) => c.broche),
    },
  };
}
